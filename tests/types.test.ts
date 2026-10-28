import { describe, expect, it } from "vitest";
import { GhostEvent, LIMITS, PossessRequest, Version } from "@/types";

describe("PossessRequest", () => {
  it("parses a minimal request and applies defaults", () => {
    const r = PossessRequest.parse({
      mode: "possess",
      code: "<button>Hi</button>",
      language: "html",
      preset: "victorian",
      intensity: "haunt",
    });
    expect(r.possessWords).toBe(false);
    expect(r.history).toEqual([]);
  });

  it("accepts a refine request with message and history", () => {
    const r = PossessRequest.parse({
      mode: "refine",
      code: "export const A = () => <div />;",
      language: "tsx",
      preset: "terminal",
      intensity: "whisper",
      message: "less scary",
      history: [{ role: "user", text: "hi" }, { role: "ghost", text: "boo" }],
    });
    expect(r.history).toHaveLength(2);
  });

  it("rejects bad enums, long messages and long history", () => {
    const base = { mode: "possess", code: "x", language: "html", preset: "victorian", intensity: "haunt" };
    expect(PossessRequest.safeParse({ ...base, preset: "pirate" }).success).toBe(false);
    expect(PossessRequest.safeParse({ ...base, language: "vue" }).success).toBe(false);
    expect(PossessRequest.safeParse({ ...base, message: "x".repeat(501) }).success).toBe(false);
    const turn = { role: "user", text: "x" };
    expect(PossessRequest.safeParse({ ...base, history: Array(7).fill(turn) }).success).toBe(false);
  });
});

describe("GhostEvent", () => {
  it("parses every event type", () => {
    const events = [
      { type: "whisper", delta: "boo" },
      { type: "code", code: "<div/>", language: "html" },
      { type: "changes", items: ["added fog"] },
      { type: "effects", names: ["ghost-fog"] },
      { type: "refusal", reason: "too_big", message: "Beyond my ghostly powers." },
      { type: "error", message: "oops", retryable: true },
      { type: "done", ms: 1200, model: "gemma-4-31b-it" },
    ];
    for (const e of events) expect(GhostEvent.parse(e)).toEqual(e);
  });

  it("rejects unknown types and unknown refusal reasons", () => {
    expect(GhostEvent.safeParse({ type: "nope" }).success).toBe(false);
    expect(GhostEvent.safeParse({ type: "refusal", reason: "bored", message: "m" }).success).toBe(false);
  });
});

describe("Version and LIMITS", () => {
  it("allows a null preset for the original", () => {
    const v = Version.parse({ id: 0, code: "<p/>", language: "html", preset: null, whisper: "", changes: [], effects: [] });
    expect(v.preset).toBeNull();
  });

  it("matches the spec size limits", () => {
    expect(LIMITS).toEqual({ maxLines: 200, maxChars: 8000, maxComponents: 3 });
  });
});
