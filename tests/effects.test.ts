import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EFFECTS, EFFECT_NAMES, effectsFor } from "@/effects/catalog";
import { PRESETS } from "@/effects/presets";
import type { Intensity } from "@/types";

const css = readFileSync(path.resolve(__dirname, "../src/effects/effects.css"), "utf8");
const cssClasses = new Set([...css.matchAll(/\.(ghost-[a-z-]+)/g)].map((m) => m[1]));

describe("effects catalogue", () => {
  it("describes all 15 effects from the spec", () => {
    expect(EFFECTS).toHaveLength(15);
    expect(new Set(EFFECTS.map((e) => e.name)).size).toBe(15);
  });

  it("has CSS for every implemented effect", () => {
    for (const e of EFFECTS.filter((x) => x.implemented)) expect(cssClasses.has(e.name), e.name).toBe(true);
  });

  it("only marks effects implemented when the CSS exists, and vice versa", () => {
    for (const e of EFFECTS) expect(cssClasses.has(e.name), e.name).toBe(e.implemented);
  });

  it("never offers an unimplemented effect to the model", () => {
    for (const preset of ["victorian", "muertos", "terminal", "gothic", "jinn"] as const) {
      for (const e of effectsFor(preset, "possession")) expect(e.implemented).toBe(true);
    }
  });
});

describe("presets", () => {
  const counts: Record<Intensity, [number, number]> = { whisper: [1, 2], haunt: [2, 4], possession: [3, 6] };

  for (const preset of Object.values(PRESETS)) {
    it(`${preset!.id} only uses real, implemented effects within the intensity budget`, () => {
      for (const level of ["whisper", "haunt", "possession"] as const) {
        const names = preset!.effects[level];
        const [min, max] = counts[level];
        expect(names.length, level).toBeGreaterThanOrEqual(min);
        expect(names.length, level).toBeLessThanOrEqual(max);
        for (const n of names) {
          expect(EFFECT_NAMES.has(n), n).toBe(true);
          expect(effectsFor(preset!.id, level).map((e) => e.name), `${n} at ${level}`).toContain(n);
        }
      }
    });
  }
});

describe("effects.css", () => {
  it("disables animation under prefers-reduced-motion", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/);
  });

  it("is pure CSS with only ghost- class selectors", () => {
    const selectors = [...css.matchAll(/^\.([\w-]+)/gm)].map((m) => m[1]);
    for (const s of selectors) expect(s.startsWith("ghost-"), s).toBe(true);
  });
});
