// Pull only the rules for the used ghost-* classes out of effects.css (the "Effects CSS" tab), plus font install hints.
// Spec: specs/01 AC-3.5, specs/04 §4.4
// Task: T2.4
import type { Preset } from "./presets/types";

interface Block {
  prelude: string;
  body: string;
}

/** Split CSS into top-level `prelude { body }` blocks. Comments are dropped. Braces never appear inside this file's strings. */
function topLevelBlocks(css: string): Block[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks: Block[] = [];
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf("{", i);
    if (open < 0) break;
    let depth = 1;
    let j = open + 1;
    while (j < src.length && depth > 0) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}") depth--;
      j++;
    }
    blocks.push({ prelude: src.slice(i, open).trim(), body: src.slice(open + 1, j - 1).trim() });
    i = j;
  }
  return blocks;
}

function selectsAny(selector: string, names: string[]): boolean {
  return names.some((n) => new RegExp(`\\.${n}(?![\\w-])`).test(selector));
}

const indent = (body: string) =>
  body
    .split("\n")
    .map((l) => `  ${l.trim()}`)
    .join("\n");

/** The CSS needed for `names`: their rules, the keyframes those rules use, the custom properties they read, and the reduced-motion guard. */
export function extractEffectsCss(css: string, names: string[]): string {
  const wanted = [...new Set(names)];
  if (wanted.length === 0) return "";
  const blocks = topLevelBlocks(css);

  const rules = blocks.filter((b) => !b.prelude.startsWith("@") && b.prelude !== ":root" && selectsAny(b.prelude, wanted));
  if (rules.length === 0) return "";
  const ruleText = rules.map((r) => `${r.prelude} { ${r.body} }`).join("\n");

  const keyframes = blocks.filter((b) => {
    const m = /^@keyframes\s+([\w-]+)/.exec(b.prelude);
    return m && new RegExp(`animation(-name)?\\s*:[^;}]*\\b${m[1]}\\b`).test(ruleText);
  });

  // Custom properties can be read by the rules or by the keyframes they pull in (ghost-candle reads --ghost-glow there).
  const readers = [ruleText, ...keyframes.map((k) => k.body)].join("\n");
  const usedVars = new Set([...readers.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
  const root = blocks.find((b) => b.prelude === ":root");
  const rootDecls = root
    ? root.body
        .split(";")
        .map((d) => d.trim())
        .filter((d) => d && usedVars.has(d.split(":")[0].trim()))
    : [];

  const animated = /animation|transition/.test(ruleText);
  const guard = animated ? blocks.filter((b) => b.prelude.startsWith("@media") && b.prelude.includes("prefers-reduced-motion")) : [];

  const out: string[] = [];
  if (rootDecls.length) out.push(`:root {\n${rootDecls.map((d) => `  ${d};`).join("\n")}\n}`);
  for (const r of rules) out.push(`${r.prelude} {\n${indent(r.body.replace(/;\s*/g, ";\n"))}\n}`.replace(/\n\s*\n/g, "\n"));
  for (const k of keyframes) out.push(`${k.prelude} {\n${indent(k.body)}\n}`);
  for (const g of guard) out.push(`${g.prelude} {\n${indent(g.body)}\n}`);
  return out.join("\n\n");
}

/** Font family → @fontsource package. Mirrors scripts/copy-vendor.ts. */
export const FONT_PACKAGES: Record<string, string> = {
  Cinzel: "cinzel",
  "Cinzel Decorative": "cinzel-decorative",
  "IM Fell English": "im-fell-english",
  Rye: "rye",
  UnifrakturCook: "unifrakturcook",
  VT323: "vt323",
};

/** Weights each package actually ships (400/700 only), so we never emit an @import that 404s. */
const FONT_WEIGHTS: Record<string, number[]> = {
  cinzel: [400, 700],
  "cinzel-decorative": [400, 700],
  "im-fell-english": [400],
  rye: [400],
  unifrakturcook: [700],
  vt323: [400],
};

/** @fontsource packages the preset's display and body fonts need. */
export function fontPackages(preset: Preset): string[] {
  const families = [preset.fonts.display, preset.fonts.body].flatMap((stack) => [...stack.matchAll(/'([^']+)'/g)].map((m) => m[1]));
  return [...new Set(families.map((f) => FONT_PACKAGES[f]).filter((p): p is string => Boolean(p)))];
}

/** Header for the Effects CSS tab: install hint plus the @import lines (spec 04 §4.4). */
export function fontHeader(preset: Preset): string {
  const pkgs = fontPackages(preset);
  if (pkgs.length === 0) return "";
  return [
    `/* Fonts for ${preset.name}: npm i ${pkgs.map((p) => `@fontsource/${p}`).join(" ")} */`,
    ...pkgs.flatMap((p) => (FONT_WEIGHTS[p] ?? [400]).map((w) => `@import "@fontsource/${p}/${w}.css";`)),
  ].join("\n");
}

/** The full text of the Effects CSS tab. */
export function effectsCssTab(css: string, names: string[], preset: Preset | null): string {
  const body = extractEffectsCss(css, names);
  const head = preset ? fontHeader(preset) : "";
  return [head, body].filter(Boolean).join("\n\n");
}
