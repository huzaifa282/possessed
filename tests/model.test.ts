import { describe, expect, it, vi } from "vitest";
import { GeminiGemmaProvider } from "@/lib/model/gemini-gemma";
import { createProvider, ProviderError } from "@/lib/model/provider";

const input = { system: "sys", user: "hi", temperature: 0.7, maxOutputTokens: 100 };

const sse = (...events: object[]) => events.map((e) => `data: ${JSON.stringify(e)}\r\n\r\n`).join("");
const chunk = (text: string, thought = false) => ({ candidates: [{ content: { parts: [{ text, thought }] } }] });

function streamResponse(parts: string[], status = 200): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (const p of parts) c.enqueue(enc.encode(p));
      c.close();
    },
  });
  return new Response(body, { status });
}

async function collect(p: GeminiGemmaProvider, signal = new AbortController().signal) {
  let out = "";
  for await (const t of p.stream(input, signal)) out += t;
  return out;
}

const make = (fetchFn: typeof fetch, models = ["m1", "m2"]) =>
  new GeminiGemmaProvider({ apiKey: "k", models, fetch: fetchFn, sleep: async () => {} });

describe("GeminiGemmaProvider", () => {
  it("streams text and skips thought parts", async () => {
    const f = vi.fn(async () => streamResponse([sse(chunk("secret", true), chunk("Hel")), sse(chunk("lo"))]));
    expect(await collect(make(f as unknown as typeof fetch))).toBe("Hello");
  });

  it("handles SSE events split across network chunks", async () => {
    const whole = sse(chunk("ab"), chunk("cd"));
    const cut = Math.floor(whole.length / 2);
    const f = vi.fn(async () => streamResponse([whole.slice(0, cut), whole.slice(cut)]));
    expect(await collect(make(f as unknown as typeof fetch))).toBe("abcd");
  });

  it("sends the key header, thinkingConfig, and never responseMimeType", async () => {
    const f = vi.fn(async (...args: [string | URL | Request, RequestInit?]) => (void args, streamResponse([sse(chunk("x"))])));
    await collect(make(f as unknown as typeof fetch));
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toContain("/models/m1:streamGenerateContent?alt=sse");
    expect((init!.headers as Record<string, string>)["x-goog-api-key"]).toBe("k");
    const body = JSON.parse(init!.body as string);
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "minimal" });
    expect(JSON.stringify(body)).not.toContain("responseMimeType");
    expect(body.systemInstruction.parts[0].text).toBe("sys");
  });

  it("retries a 500 and then succeeds", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(streamResponse([sse(chunk("ok"))]));
    expect(await collect(make(f as unknown as typeof fetch))).toBe("ok");
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("switches to the fallback model on a 429", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(streamResponse([sse(chunk("ok"))]));
    const p = make(f as unknown as typeof fetch);
    expect(await collect(p)).toBe("ok");
    expect(String(f.mock.calls[1][0])).toContain("/models/m2:");
    expect(p.id).toBe("gemini-gemma:m2");
  });

  it("switches model after two failures", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(streamResponse([sse(chunk("ok"))]));
    await collect(make(f as unknown as typeof fetch));
    expect(String(f.mock.calls[2][0])).toContain("/models/m2:");
  });

  it("does not retry a 400 and marks it non-retryable", async () => {
    const f = vi.fn(async () => new Response("", { status: 400 }));
    await expect(collect(make(f as unknown as typeof fetch))).rejects.toMatchObject({ retryable: false, status: 400 });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("gives up with a retryable error after repeated failures", async () => {
    const f = vi.fn(async () => new Response("", { status: 500 }));
    await expect(collect(make(f as unknown as typeof fetch))).rejects.toMatchObject({ retryable: true });
    expect(f).toHaveBeenCalledTimes(4);
  });

  it("retries network errors", async () => {
    const f = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(streamResponse([sse(chunk("ok"))]));
    expect(await collect(make(f as unknown as typeof fetch))).toBe("ok");
  });

  it("does not retry after text has been emitted", async () => {
    const enc = new TextEncoder();
    let pulls = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        if (pulls++ === 0) c.enqueue(enc.encode(sse(chunk("partial"))));
        else c.error(new Error("connection reset"));
      },
    });
    const f = vi.fn(async () => new Response(body));
    const p = make(f as unknown as typeof fetch);
    const got: string[] = [];
    await expect(
      (async () => {
        for await (const t of p.stream(input, new AbortController().signal)) got.push(t);
      })(),
    ).rejects.toBeInstanceOf(ProviderError);
    expect(got).toEqual(["partial"]);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("stops without retrying when aborted", async () => {
    const ctrl = new AbortController();
    const f = vi.fn(async () => {
      ctrl.abort();
      throw new DOMException("Aborted", "AbortError");
    });
    await expect(collect(make(f as unknown as typeof fetch), ctrl.signal)).rejects.toBeDefined();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("health reports ok and failures", async () => {
    const ok = make((async () => new Response("{}", { status: 200 })) as unknown as typeof fetch);
    expect((await ok.health()).ok).toBe(true);
    const bad = make((async () => new Response("", { status: 403 })) as unknown as typeof fetch);
    expect(await bad.health()).toEqual({ ok: false, detail: "HTTP 403" });
  });
});

describe("createProvider", () => {
  it("requires GEMINI_API_KEY", () => {
    expect(() => createProvider({})).toThrow(/GEMINI_API_KEY/);
  });

  it("uses GEMMA_MODELS, primary first", () => {
    const p = createProvider({ GEMINI_API_KEY: "k", GEMMA_MODELS: "a, b" });
    expect(p.id).toBe("gemini-gemma:a");
  });

  it("rejects unsupported providers", () => {
    expect(() => createProvider({ MODEL_PROVIDER: "nope", GEMINI_API_KEY: "k" })).toThrow(/Unsupported/);
  });
});
