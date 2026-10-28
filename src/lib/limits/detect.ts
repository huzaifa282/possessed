// Language detection: html | jsx | tsx | unknown.
// Spec: specs/03-input-and-limits.md §3.1
// Task: T1.4
import type { Language } from "@/types";

export type DetectedLanguage = Language | "unknown";

const LEADING_COMMENTS = /^(\s*<!--[\s\S]*?-->)+/;
const JS_WRAPPER = /^\s*(import\s|export\s|function\s|const\s|let\s|var\s|class\s|\/\/|\/\*)/;
const HAS_MARKUP = /<\/?[A-Za-z][\w.-]*[\s/>]|<>/;
const TS_SIGNALS = [
  /:\s*React\.(FC|FunctionComponent)\b/,
  /\binterface\s+\w+/,
  /\btype\s+\w+\s*(<[^>]*>)?\s*=/,
  /<\w*Props>/,
  /\)\s*:\s*(JSX\.Element|React\.ReactNode)/,
  /\(\s*\{[^)]*\}\s*:\s*\w*Props\b/,
];
const JSX_SIGNALS = [
  /import\s[^;]*from\s+['"]react['"]/,
  /export\s+default\s+function\b/,
  /\bclassName\s*=/,
  /\breturn\s*\(\s*</,
  /=>\s*\(?\s*</,
];

export function detect(code: string): DetectedLanguage {
  const src = code.replace(LEADING_COMMENTS, "").trim();
  if (!src || !HAS_MARKUP.test(src)) return "unknown";

  if (!JS_WRAPPER.test(src) && src.startsWith("<")) return "html";

  const isJsx = JSX_SIGNALS.some((re) => re.test(src));
  if (!isJsx) return "unknown";
  return TS_SIGNALS.some((re) => re.test(src)) ? "tsx" : "jsx";
}
