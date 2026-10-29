import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { effectsCssTab, extractEffectsCss, fontHeader, fontPackages } from "@/effects/extract";
import { PRESETS } from "@/effects/presets";

const css = readFileSync(path.resolve(__dirname, "../src/effects/effects.css"), "utf8");

describe("extractEffectsCss", () => {
  it("returns nothing for no effects or unknown ones", () => {
    expect(extractEffectsCss(css, [])).toBe("");
    expect(extractEffectsCss(css, ["ghost-nope"])).toBe("");
  });

  it("includes only the rules, keyframes and variables a used effect needs", () => {
    const out = extractEffectsCss(css, ["ghost-candle"]);
    expect(out).toContain(".ghost-candle");
    expect(out).toContain("@keyframes ghost-candle");
    expect(out).toContain("--ghost-glow:");
    expect(out).not.toContain("--ghost-gold");
    expect(out).not.toContain("ghost-fog");
    expect(out).not.toContain("ghost-crt");
  });

  it("keeps pseudo-element rules and the keyframes they reference", () => {
    const out = extractEffectsCss(css, ["ghost-fog"]);
    expect(out).toContain(".ghost-fog::before");
    expect(out).toContain("@keyframes ghost-fog-drift");
  });

  it("includes both cobwebs from the shared selector", () => {
    const out = extractEffectsCss(css, ["ghost-cobweb-tl"]);
    expect(out).toContain(".ghost-cobweb-tl::after");
    expect(out).toContain(".ghost-cobweb-tr");
  });

  it("adds the reduced-motion guard only when something animates", () => {
    expect(extractEffectsCss(css, ["ghost-candle"])).toContain("prefers-reduced-motion");
    expect(extractEffectsCss(css, ["ghost-ornate"])).not.toContain("prefers-reduced-motion");
  });

  it("does not match a longer class name by prefix", () => {
    const out = extractEffectsCss(css, ["ghost-cobweb"]);
    expect(out).toBe("");
  });

  it("has balanced braces for every effect combination it emits", () => {
    const all = [...css.matchAll(/\.(ghost-[\w-]+)/g)].map((m) => m[1]);
    const out = extractEffectsCss(css, all);
    expect((out.match(/{/g) ?? []).length).toBe((out.match(/}/g) ?? []).length);
  });
});

describe("fonts", () => {
  it("maps preset fonts to @fontsource packages", () => {
    expect(fontPackages(PRESETS.victorian!)).toEqual(["cinzel", "im-fell-english"]);
    expect(fontPackages(PRESETS.terminal!)).toEqual(["vt323"]);
  });

  it("only imports weights the package ships", () => {
    const head = fontHeader(PRESETS.victorian!);
    expect(head).toContain('@import "@fontsource/cinzel/700.css";');
    expect(head).toContain('@import "@fontsource/im-fell-english/400.css";');
    expect(head).not.toContain("im-fell-english/700");
    expect(head).toContain("npm i @fontsource/cinzel @fontsource/im-fell-english");
  });

  it("builds the tab text with fonts first, then CSS", () => {
    const text = effectsCssTab(css, ["ghost-candle"], PRESETS.victorian!);
    expect(text.indexOf("@import")).toBeLessThan(text.indexOf(".ghost-candle"));
    expect(effectsCssTab(css, [], null)).toBe("");
  });
});
