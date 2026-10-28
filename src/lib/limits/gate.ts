// Size gate, whole-page / non-UI / unsafe detection, in-character refusal messages. Shared by client and server.
// Spec: specs/03-input-and-limits.md §3.2
// Task: T1.4
import { LIMITS, type RefusalReason } from "@/types";
import type { DetectedLanguage } from "./detect";

export type GateReason = Exclude<RefusalReason, "rate_limited">;

export interface GateStats {
  lines: number;
  chars: number;
  components: number;
  language: DetectedLanguage;
}

export type GateResult =
  | { ok: true; stats: GateStats }
  | { ok: false; reason: GateReason; message: string; stats: GateStats };

export const REFUSAL_MESSAGES: Record<GateReason, readonly string[]> = {
  empty: [
    "I sense… nothing. Paste a component and I will possess it.",
    "The room is empty. Give me a component to haunt.",
    "Not even a whisper of markup. Paste something for me to possess.",
  ],
  too_big: [
    "This is beyond my ghostly powers. Bring me one component at a time.",
    "Too much for one haunting. Show me a single component.",
    "My chains cannot hold this much. One component at a time, please.",
  ],
  whole_page: [
    "A whole house? I only haunt one room at a time.",
    "So many rooms… choose one and I'll haunt it properly.",
    "That is a whole manor. Bring me a single chamber.",
  ],
  not_ui: [
    "I possess interfaces, not their plumbing. Strip it to the component.",
    "Pipes and wires are not my domain. Give me the markup alone.",
    "There is no body here for me to possess.",
  ],
  unsafe: [
    "I don't touch other spirits' scripts.",
    "Foreign scripts and frames are cursed. Remove them and I will return.",
    "I will not invite strange spirits in. Take out the external scripts.",
  ],
};

const MIN_CHARS = 20;
const SECTION_TAGS = /<(header|main|footer|section)[\s>]/gi;
const COMPONENT_DEFS = [
  /\bfunction\s+([A-Z]\w*)/g,
  /\b(?:const|let|var)\s+([A-Z]\w*)\s*(?::[^=]+)?=\s*(?:React\.)?(?:memo\(|forwardRef\(|\(|async\b|function\b|\w+\s*=>)/g,
  /\bclass\s+([A-Z]\w*)\s+extends\b/g,
];
const WHOLE_PAGE_TAGS = /<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i;
const NON_UI = [
  /\bfetch\s*\(/,
  /\baxios\b/,
  /\buseQuery\b/,
  /\bgetServerSideProps\b/,
  /['"]use server['"]/,
  /<Route[\s>]/,
  /\b(SELECT\s[\s\S]+?\sFROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|DROP\s+TABLE)\b/,
];
const MARKUP = /<\/[A-Za-z][\w.-]*\s*>|<\/>|<[A-Za-z][\w.-]*(\s[^<>]*)?\/>|<[A-Za-z][\w.-]*\s+[\w:-]+\s*=/;
const UNSAFE = /<script\b[^>]*\bsrc\s*=|<iframe\b/i;

function pick(reason: GateReason): string {
  const list = REFUSAL_MESSAGES[reason];
  return list[Math.floor(Math.random() * list.length)];
}

function countComponents(code: string): number {
  const names = new Set<string>();
  for (const re of COMPONENT_DEFS) for (const m of code.matchAll(re)) names.add(m[1]);
  return names.size;
}

export function gate(
  code: string,
  language: DetectedLanguage,
  limits: { maxLines: number; maxChars: number } = LIMITS,
): GateResult {
  const trimmed = code.trim();
  const sections = (code.match(SECTION_TAGS) ?? []).length;
  const defs = countComponents(code);
  const stats: GateStats = {
    lines: code.replace(/\n+$/, "").split("\n").length,
    chars: code.length,
    components: language === "html" ? sections : defs,
    language,
  };
  const refuse = (reason: GateReason): GateResult => ({ ok: false, reason, message: pick(reason), stats });

  if (trimmed.length < MIN_CHARS) return refuse("empty");
  if (stats.lines > limits.maxLines || stats.chars > limits.maxChars) return refuse("too_big");
  if (WHOLE_PAGE_TAGS.test(code)) return refuse("whole_page");
  if (defs > LIMITS.maxComponents || sections > LIMITS.maxComponents) return refuse("whole_page");
  if (NON_UI.some((re) => re.test(code))) return refuse("not_ui");
  if (!MARKUP.test(code)) return refuse("not_ui");
  if (UNSAFE.test(code)) return refuse("unsafe");
  return { ok: true, stats };
}
