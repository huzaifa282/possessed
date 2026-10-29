import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimiter } from "@/lib/limits/ratelimit";
import { parseSse } from "@/lib/ghost/sse";
import type { ModelProvider } from "@/lib/model/provider";
import type { GhostEvent } from "@/types";

const stream = vi.fn();
const provider: ModelProvider = {
  id: "fake:model",
  async health() {
    return { ok: true, detail: "fake reachable" };
  },
  stream,
};
let limiter: RateLimiter;
let latency: number | null = null;

vi.mock("@/lib/model/runtime", () => ({
  getProvider: () => provider,
  getRateLimiter: () => limiter,
  recordLatency: (ms: number) => (latency = ms),
  lastLatency: () => latency,
}));

const { POST } = await import("@/app/api/possess/route");
const { GET } = await import("@/app/api/health/route");

const fixture = (name: string) => readFileSync(path.resolve(__dirname, "fixtures/components", name), "utf8");
const REPLY = `<whisper>Delicious.</whisper>\n<code lang="jsx">\n${fixture("pricing-card.jsx")}\n</code>\n<changes>\n- Re-themed\n</changes>\n<effects>ghost-candle</effects>`;

const post = (body: unknown, ip = "1.2.3.4") =>
  POST(
    new Request("http://test/api/possess", {
      method: "POST",
      headers: { "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const base = { mode: "possess", code: fixture("pricing-card.jsx"), language: "jsx", preset: "victorian", intensity: "haunt" };

async function events(res: Response) {
  const out: GhostEvent[] = [];
  for await (const e of parseSse(res.body!)) out.push(e);
  return out;
}

beforeEach(() => {
  stream.mockReset();
  stream.mockImplementation(() =>
    (async function* () {
      for (let i = 0; i < REPLY.length; i += 23) yield REPLY.slice(i, i + 23);
    })(),
  );
  limiter = new RateLimiter({ perHour: 20 });
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("POST /api/possess", () => {
  it("streams the whisper before the code, then done", async () => {
    const res = await post(base);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const evs = await events(res);
    const types = evs.map((e) => e.type);
    expect(types.indexOf("whisper")).toBeLessThan(types.indexOf("code"));
    expect(types.at(-1)).toBe("done");
    expect(latency).not.toBeNull();
  });

  it("refuses oversized input without calling the model", async () => {
    const evs = await events(await post({ ...base, code: fixture("huge-dashboard.jsx") }));
    expect(evs[0]).toMatchObject({ type: "refusal", reason: "too_big" });
    expect(stream).not.toHaveBeenCalled();
  });

  it("does not spend rate-limit allowance on refusals", async () => {
    limiter = new RateLimiter({ perHour: 1 });
    await post({ ...base, code: "x" });
    const evs = await events(await post(base));
    expect(evs.some((e) => e.type === "code")).toBe(true);
  });

  it("returns 400 for malformed JSON and bad schema", async () => {
    expect((await post("{nope")).status).toBe(400);
    expect((await post({ ...base, preset: "sparkly" })).status).toBe(400);
  });

  it("returns 413 for a huge body", async () => {
    expect((await post("x".repeat(70 * 1024))).status).toBe(413);
  });

  it("rate-limits per IP", async () => {
    limiter = new RateLimiter({ perHour: 2 });
    await events(await post(base));
    await events(await post(base));
    const evs = await events(await post(base));
    expect(evs[0]).toMatchObject({ type: "refusal", reason: "rate_limited" });
    expect(stream).toHaveBeenCalledTimes(2);
    const other = await events(await post(base, "9.9.9.9"));
    expect(other.some((e) => e.type === "code")).toBe(true);
  });

  it("never logs the pasted code", async () => {
    await events(await post(base));
    const logged = (console.log as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().join("\n");
    expect(logged).toContain('"preset":"victorian"');
    expect(logged).not.toContain("className");
  });
});

describe("GET /api/health", () => {
  it("reports provider, model and last latency", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ provider: "fake", model: "model", ok: true });
  });
});
