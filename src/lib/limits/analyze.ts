// Client-side view of the gate: detected/effective language, gate verdict, size meter level.
// Spec: specs/03-input-and-limits.md §3.1–3.2, specs/01 AC-1.2, AC-2.4
// Task: T2.2
import { LIMITS, type Language } from "@/types";
import { detect, type DetectedLanguage } from "./detect";
import { gate, type GateResult } from "./gate";

export type MeterLevel = "ok" | "warn" | "over";

export interface Analysis {
  detected: DetectedLanguage;
  /** The override if set, otherwise the detected language; "unknown" means the user must choose. */
  language: DetectedLanguage;
  gate: GateResult;
  /** Largest of lines/maxLines and chars/maxChars (1 = at the limit). */
  usage: number;
  level: MeterLevel;
  /** True when the code may be sent to the model. */
  canPossess: boolean;
}

export function meterLevel(usage: number): MeterLevel {
  if (usage > 1) return "over";
  if (usage >= 0.7) return "warn";
  return "ok";
}

export function analyze(code: string, override: Language | null = null): Analysis {
  const detected = detect(code);
  const language = override ?? detected;
  const verdict = gate(code, language);
  const usage = Math.max(verdict.stats.lines / LIMITS.maxLines, verdict.stats.chars / LIMITS.maxChars);
  return { detected, language, gate: verdict, usage, level: meterLevel(usage), canPossess: verdict.ok && language !== "unknown" };
}
