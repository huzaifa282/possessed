import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { possess } from "@/lib/ghost/possess";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ghost/prompt";
import { getPreset } from "@/effects/presets";
import { ProviderError, type ModelProvider, type StreamInput } from "@/lib/model/provider";
import { PossessRequest, type GhostEvent } from "@/types";

const JSX = readFileSync(path.resolve(__dirname, "fixtures/components/pricing-card.jsx"), "utf8");

const req = (over: Partial<PossessRequest> = {}) =>
  PossessRequest.parse({ mode: "possess", code: JSX, language: "jsx", preset: "victorian", intensity: "haunt", ...over });

const reply = (code: string, whisper = "Delicious.") =>
  `<whisper>${whisper}</whisper>\n<code lang="jsx">\n${code}\n</code>\n<changes>\n- Re-themed\n</changes>\n<effects>ghost-candle</effects>`;

function fake(replies: (string | Error)[]) {
  const calls: StreamInput[] = [];
  const provider: ModelProvider = {
    id: "fake:model",
    async health() {
      return { ok: true, detail: "ok" };
    },
    stream(input) {
      calls.push(input);
      const r = replies[Math.min(calls.length - 1, replies.length - 1)];
      return (async function* () {
        if (r instanceof Error) throw r;
        // Deliver in small chunks to exercise the streaming path.
        for (let i = 0; i < r.length; i += 17) yield r.slice(i, i + 17);
      })();
    },
  };
  return { provider, calls };
}

async function collect(r: PossessRequest, provider: ModelProvider) {
  const events: GhostEvent[] = [];
  for await (const e of possess(r, provider, new AbortController().signal)) events.push(e);
  return events;
}

describe("possess", () => {
  it("streams the whisper, then code, changes, effects and done", async () => {
    const { provider } = fake([reply(JSX.replaceAll("bg-white", "bg-stone-900"))]);
    const events = await collect(req(), provider);
    expect(events.map((e) => e.type).filter((t, i, a) => a.indexOf(t) === i)).toEqual(["whisper", "code", "changes", "effects", "done"]);
    const code = events.find((e) => e.type === "code");
    expect(code && code.type === "code" && code.code).toContain("bg-stone-900");
    const done = events.at(-1);
    expect(done).toMatchObject({ type: "done", model: "fake:model" });
  });

  it("refuses oversized input without calling the model", async () => {
    const { provider, calls } = fake([reply(JSX)]);
    const big = readFileSync(path.resolve(__dirname, "fixtures/components/huge-dashboard.jsx"), "utf8");
    const events = await collect(req({ code: big }), provider);
    expect(events).toEqual([expect.objectContaining({ type: "refusal", reason: "too_big" })]);
    expect(calls).toHaveLength(0);
  });

  it("retries once with the error appended, without repeating the whisper", async () => {
    const { provider, calls } = fake([reply(JSX.replace("</button>", "")), reply(JSX)]);
    const events = await collect(req(), provider);
    expect(calls).toHaveLength(2);
    expect(calls[1].user).toContain("Your previous code failed");
    expect(events.filter((e) => e.type === "whisper").map((e) => (e as { delta: string }).delta).join("")).toBe("Delicious.");
    expect(events.at(-1)?.type).toBe("done");
  });

  it("gives an in-character retryable error after a second failure", async () => {
    const { provider, calls } = fake([reply("not valid {{"), reply("still not valid {{")]);
    const events = await collect(req(), provider);
    expect(calls).toHaveLength(2);
    expect(events.at(-1)).toMatchObject({ type: "error", retryable: true });
    expect(events.some((e) => e.type === "code")).toBe(false);
  });

  it("retries when the model returns no code for a possession", async () => {
    const { provider, calls } = fake(["<whisper>I refuse.</whisper>", reply(JSX)]);
    const events = await collect(req(), provider);
    expect(calls).toHaveLength(2);
    expect(events.some((e) => e.type === "code")).toBe(true);
  });

  it("accepts a refine reply with no code", async () => {
    const { provider, calls } = fake(["<whisper>It is already perfect.</whisper>"]);
    const events = await collect(req({ mode: "refine", message: "keep my blue" }), provider);
    expect(calls).toHaveLength(1);
    expect(events.some((e) => e.type === "whisper")).toBe(true);
    expect(events.some((e) => e.type === "code")).toBe(false);
    expect(events.at(-1)?.type).toBe("done");
  });

  it("answers an ask with a whisper only", async () => {
    const { provider, calls } = fake(["<whisper>Candles flicker because of drafts.</whisper>"]);
    const events = await collect(req({ mode: "ask", message: "why the glow?" }), provider);
    expect(calls).toHaveLength(1);
    expect(calls[0].system).toContain("only <whisper>");
    expect(events.some((e) => e.type === "code")).toBe(false);
    expect(events.at(-1)?.type).toBe("done");
  });

  it("reports unknown effects as stripped", async () => {
    const { provider } = fake([reply(JSX.replace('className="mx-auto', 'className="ghost-bogus mx-auto'))]);
    const events = await collect(req(), provider);
    const changes = events.find((e) => e.type === "changes");
    expect(changes && changes.type === "changes" && changes.items.join(" ")).toContain("ghost-bogus");
  });

  it("turns provider failures into an error event", async () => {
    const { provider } = fake([new ProviderError("down", true, 503)]);
    expect((await collect(req(), provider)).at(-1)).toMatchObject({ type: "error", retryable: true });
    const bad = fake([new ProviderError("bad key", false, 401)]);
    expect((await collect(req(), bad.provider)).at(-1)).toMatchObject({ type: "error", retryable: false });
  });

  it("returns an error for a preset that is not built yet", async () => {
    const { provider, calls } = fake([reply(JSX)]);
    const events = await collect(req({ preset: "jinn" }), provider);
    expect(events.at(-1)).toMatchObject({ type: "error", retryable: false });
    expect(calls).toHaveLength(0);
  });
});

describe("prompts", () => {
  it("includes the preset, intensity, only implemented effects, and the output contract", () => {
    const r = req();
    const sys = buildSystemPrompt({ req: r, preset: getPreset("victorian") });
    expect(sys).toContain("Haunted Victorian");
    expect(sys).toContain("ghost-ornate");
    expect(sys).not.toContain("ghost-marigold");
    expect(sys).not.toContain("ghost-crt");
    expect(sys).toContain('<code lang="jsx">');
    expect(sys).toContain("Keep all visible text exactly as it is.");
  });

  it("allows rewriting words only when asked", () => {
    const sys = buildSystemPrompt({ req: req({ possessWords: true }), preset: getPreset("terminal") });
    expect(sys).toContain("rewrite the visible text");
  });

  it("builds refine prompts with history and the user's message", () => {
    const u = buildUserPrompt(
      req({ mode: "refine", message: "less scary", history: [{ role: "user", text: "hi" }, { role: "ghost", text: "boo" }] }),
    );
    expect(u).toContain("User: hi");
    expect(u).toContain("Vesper: boo");
    expect(u).toContain("The user says: less scary");
  });
});
