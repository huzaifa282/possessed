import { describe, expect, it } from "vitest";
import { GhostParser, type ParseEvent } from "@/lib/ghost/parse";

function run(chunks: string[], lang: "html" | "jsx" | "tsx" = "jsx") {
  const p = new GhostParser(lang);
  const events: ParseEvent[] = [];
  for (const c of chunks) events.push(...p.push(c));
  events.push(...p.end());
  return { events, result: p.result() };
}

const FULL = `<whisper>Ah, a fine specimen.</whisper>
<code lang="jsx">
export default function A() { return <div className="ghost-candle">Hi</div>; }
</code>
<changes>
- Swapped the palette
- Added ghost-candle
</changes>
<effects>ghost-candle, ghost-fog</effects>`;

const split = (s: string, n: number) => s.match(new RegExp(`[\\s\\S]{1,${n}}`, "g")) ?? [];

describe("GhostParser", () => {
  it("parses a complete reply", () => {
    const { result } = run([FULL]);
    expect(result.whisper).toBe("Ah, a fine specimen.");
    expect(result.code?.language).toBe("jsx");
    expect(result.code?.code).toContain("export default function A");
    expect(result.changes).toEqual(["Swapped the palette", "Added ghost-candle"]);
    expect(result.effects).toEqual(["ghost-candle", "ghost-fog"]);
    expect(result.truncated).toBe(false);
  });

  it.each([1, 2, 3, 5, 7, 13])("gives the same result when tags are split across %i-char chunks", (n) => {
    const whole = run([FULL]).result;
    const chunked = run(split(FULL, n)).result;
    expect(chunked).toEqual(whole);
  });

  it("streams whisper deltas live and never leaks a partial closing tag", () => {
    const { events } = run(split(FULL, 4));
    const whisper = events.flatMap((e) => (e.type === "whisper" ? [e.delta] : [])).join("");
    expect(whisper).toBe("Ah, a fine specimen.");
    expect(events.filter((e) => e.type === "whisper").length).toBeGreaterThan(1);
  });

  it("ignores a preamble before <whisper>", () => {
    const { result } = run(["Sure! Here you go:\n\n", FULL]);
    expect(result.whisper).toBe("Ah, a fine specimen.");
    expect(result.code).not.toBeNull();
  });

  it("strips markdown fences inside <code>", () => {
    const { result } = run(['<whisper>x</whisper><code lang="html">\n```html\n<div>hi</div>\n```\n</code>'], "html");
    expect(result.code?.code).toBe("<div>hi</div>");
  });

  it("tolerates a missing </effects>", () => {
    const { result } = run(["<whisper>x</whisper><code lang=\"jsx\">a</code><effects>ghost-fog, ghost-candle"]);
    expect(result.effects).toEqual(["ghost-fog", "ghost-candle"]);
  });

  it("tolerates a missing </changes> when <effects> follows", () => {
    const { result } = run(["<whisper>x</whisper><code lang=\"jsx\">a</code><changes>\n- one\n- two\n<effects>ghost-fog</effects>"]);
    expect(result.changes).toEqual(["one", "two"]);
    expect(result.effects).toEqual(["ghost-fog"]);
  });

  it("falls back to the input language when lang is missing or unknown", () => {
    expect(run(["<whisper>x</whisper><code>a</code>"], "tsx").result.code?.language).toBe("tsx");
    expect(run(['<whisper>x</whisper><code lang="vue">a</code>'], "html").result.code?.language).toBe("html");
  });

  it("handles an ask reply with only a whisper", () => {
    const { result } = run(["<whisper>Because candles flicker.</whisper>"]);
    expect(result.whisper).toBe("Because candles flicker.");
    expect(result.code).toBeNull();
    expect(result.truncated).toBe(false);
  });

  it("flags truncated code and discards it", () => {
    const { result } = run(['<whisper>x</whisper><code lang="jsx">export default function A() {']);
    expect(result.code).toBeNull();
    expect(result.truncated).toBe(true);
  });

  it("returns an empty result for output with no tags", () => {
    const { result } = run(["I cannot help with that."]);
    expect(result.whisper).toBe("");
    expect(result.code).toBeNull();
  });

  it("does not choke on '<' inside code", () => {
    const { result } = run(['<whisper>x</whisper><code lang="jsx">if (a < b) { return <b>x</b>; }</code>']);
    expect(result.code?.code).toBe("if (a < b) { return <b>x</b>; }");
  });
});
