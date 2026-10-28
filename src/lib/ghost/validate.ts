// Language match, Sucrase/parse5 check, structure + effects + text-preservation checks.
// Spec: specs/06-ghost-engine.md §6.6
// Task: T1.8
import { parseFragment } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";
import { transform } from "sucrase";
import { EFFECT_NAMES } from "@/effects/catalog";
import { SUCRASE_OPTIONS } from "@/lib/preview/transform";
import type { Language } from "@/types";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];

export interface ValidateInput {
  original: string;
  language: Language;
  output: { code: string; language: Language };
  possessWords: boolean;
  knownEffects?: ReadonlySet<string>;
}

export type ValidateResult =
  | { ok: true; code: string; effectsUsed: string[]; strippedEffects: string[] }
  | { ok: false; error: string };

export const TEXT_MATCH_THRESHOLD = 0.9;
export const HTML_STRUCTURE_TOLERANCE = 0.2;

export function validate({ original, language, output, possessWords, knownEffects = EFFECT_NAMES }: ValidateInput): ValidateResult {
  const fail = (error: string): ValidateResult => ({ ok: false, error });

  // 1. language
  if (output.language !== language) return fail(`The code must use lang="${language}" but you returned lang="${output.language}".`);
  if (!output.code.trim()) return fail("The <code> block was empty.");

  // 2. parse
  const parseError = language === "html" ? checkHtml(output.code) : checkJsx(output.code);
  if (parseError) return fail(parseError);

  // 3. structure
  const structureError = language === "html" ? htmlStructure(original, output.code) : jsxStructure(original, output.code);
  if (structureError) return fail(structureError);

  // 4. effects: strip unknown ghost-* classes
  const { code, used, stripped } = cleanEffects(output.code, knownEffects);

  // 5. text preservation
  if (!possessWords) {
    const missing = missingText(original, code, language);
    if (missing) return fail(missing);
  }

  return { ok: true, code, effectsUsed: used, strippedEffects: stripped };
}

// ---------- parse checks ----------

function checkJsx(code: string): string | null {
  try {
    transform(code, SUCRASE_OPTIONS);
    return null;
  } catch (e) {
    return `The code does not compile: ${e instanceof Error ? e.message : String(e)}`;
  }
}

function elementChildren(nodes: Node[]): Element[] {
  return nodes.filter((n): n is Element => "tagName" in n);
}

function walk(node: Node, visit: (n: Node) => void) {
  visit(node);
  const children = "content" in node ? node.content.childNodes : "childNodes" in node ? node.childNodes : [];
  for (const c of children) walk(c, visit);
}

function checkHtml(code: string): string | null {
  let problem: string | null = null;
  const root = parseFragment(code);
  for (const child of root.childNodes) {
    walk(child, (n) => {
      if (problem || !("tagName" in n)) return;
      if (n.tagName === "iframe") problem = "The HTML must not contain <iframe>.";
      if (n.tagName === "script" && n.attrs.some((a) => a.name === "src")) problem = "The HTML must not contain <script src>.";
    });
  }
  return problem;
}

// ---------- structure ----------

function exportedNames(code: string): string[] {
  const names = new Set<string>();
  for (const re of [
    /export\s+default\s+(?:async\s+)?(?:function|class)\s+(\w+)/g,
    /export\s+(?:async\s+)?function\s+(\w+)/g,
    /export\s+(?:const|let|var|class)\s+(\w+)/g,
  ]) {
    for (const m of code.matchAll(re)) names.add(m[1]);
  }
  if (names.size === 0) {
    const first = /\b(?:function|const|let|var|class)\s+([A-Z]\w*)/.exec(code);
    if (first) names.add(first[1]);
  }
  return [...names];
}

function jsxStructure(original: string, output: string): string | null {
  for (const name of exportedNames(original)) {
    if (!new RegExp(`\\b(?:function|const|let|var|class)\\s+${name}\\b`).test(output)) {
      return `The component "${name}" must keep its name.`;
    }
  }
  if (/export\s+default\b/.test(original) && !/export\s+default\b/.test(output)) {
    return "The component must keep its default export.";
  }
  return null;
}

function topLevelCount(code: string): number {
  // <style> and <script> blocks are not structure (the ghost may add one <style>).
  return elementChildren(parseFragment(code).childNodes).filter((e) => !["style", "script", "link"].includes(e.tagName)).length;
}

function htmlStructure(original: string, output: string): string | null {
  const a = topLevelCount(original);
  const b = topLevelCount(output);
  if (Math.abs(a - b) > a * HTML_STRUCTURE_TOLERANCE) {
    return `The HTML had ${a} top-level element(s) and your version has ${b}. Keep the structure.`;
  }
  return null;
}

// ---------- effects ----------

const CLASS_ATTR = /(\bclass(?:Name)?\s*=\s*)(["'])([\s\S]*?)\2/g;

function cleanEffects(code: string, known: ReadonlySet<string>) {
  const used = new Set<string>();
  const stripped = new Set<string>();
  const cleaned = code.replace(CLASS_ATTR, (_m, prefix: string, quote: string, value: string) => {
    const tokens = value.split(/\s+/).filter(Boolean);
    const kept = tokens.filter((t) => {
      if (!t.startsWith("ghost-")) return true;
      if (known.has(t)) {
        used.add(t);
        return true;
      }
      stripped.add(t);
      return false;
    });
    return `${prefix}${quote}${kept.join(" ")}${quote}`;
  });
  return { code: cleaned, used: [...used], stripped: [...stripped] };
}

// ---------- text preservation ----------

const NON_TEXT_ATTRS =
  /\b(?:className|class|key|type|href|src|id|htmlFor|for|style|rel|target|name|role|method|action|viewBox|d|fill|stroke|xmlns|aria-[\w-]+|data-[\w-]+)\s*=\s*(?:"[^"]*"|'[^']*'|\{[^}]*\})/g;
const NON_WORD_LITERAL = /^(?:#[0-9a-f]{3,8}|[\d.\s]+(?:px|rem|em|%|s|ms)?|(?:rgb|hsl)a?\(.*)$/i;

function words(text: string): string[] {
  return text.toLowerCase().match(/\p{L}{2,}/gu) ?? [];
}

function jsxText(code: string): string[] {
  const src = code
    .replace(/^\s*import[^;\n]*;?\s*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(NON_TEXT_ATTRS, "");
  const pieces: string[] = [];
  for (const m of src.matchAll(/>([^<>{}]+)</g)) pieces.push(m[1]);
  for (const m of src.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`$]*)`/g)) {
    const lit = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    if (lit && !NON_WORD_LITERAL.test(lit)) pieces.push(lit);
  }
  return pieces.flatMap(words);
}

function htmlText(code: string): string[] {
  const out: string[] = [];
  const visit = (n: Node) => {
    if ("tagName" in n && (n.tagName === "script" || n.tagName === "style")) return;
    if (n.nodeName === "#text" && "value" in n) out.push(n.value);
    const children = "content" in n ? n.content.childNodes : "childNodes" in n ? n.childNodes : [];
    children.forEach(visit);
  };
  parseFragment(code).childNodes.forEach(visit);
  return out.flatMap(words);
}

function visibleWords(code: string, language: Language): string[] {
  return language === "html" ? htmlText(code) : jsxText(code);
}

function missingText(original: string, output: string, language: Language): string | null {
  const wanted = [...new Set(visibleWords(original, language))];
  if (wanted.length === 0) return null;
  const have = new Set(visibleWords(output, language));
  const lost = wanted.filter((w) => !have.has(w));
  const matched = (wanted.length - lost.length) / wanted.length;
  if (matched >= TEXT_MATCH_THRESHOLD) return null;
  return `The visible text changed too much (${Math.round(matched * 100)}% kept). Keep every word; missing: ${lost.slice(0, 8).join(", ")}.`;
}
