// Shared schemas and types. Source of truth: specs/02-architecture.md "Key types" and specs/06-ghost-engine.md.
import { z } from "zod";

export const Language = z.enum(["html", "jsx", "tsx"]);
export type Language = z.infer<typeof Language>;

export const PresetId = z.enum(["victorian", "muertos", "terminal", "gothic", "jinn"]);
export type PresetId = z.infer<typeof PresetId>;

export const Intensity = z.enum(["whisper", "haunt", "possession"]);
export type Intensity = z.infer<typeof Intensity>;

export const RefusalReason = z.enum(["empty", "too_big", "whole_page", "not_ui", "unsafe", "rate_limited"]);
export type RefusalReason = z.infer<typeof RefusalReason>;

export const ChatTurn = z.object({ role: z.enum(["user", "ghost"]), text: z.string().max(2000) });

export const PossessRequest = z.object({
  mode: z.enum(["possess", "refine", "ask"]),
  code: z.string(),
  language: Language,
  preset: PresetId,
  intensity: Intensity,
  possessWords: z.boolean().default(false),
  message: z.string().max(500).optional(),
  history: z.array(ChatTurn).max(6).default([]),
});
export type PossessRequest = z.infer<typeof PossessRequest>;

export const GhostEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("whisper"), delta: z.string() }),
  z.object({ type: z.literal("code"), code: z.string(), language: Language }),
  z.object({ type: z.literal("changes"), items: z.array(z.string()) }),
  z.object({ type: z.literal("effects"), names: z.array(z.string()) }),
  z.object({ type: z.literal("refusal"), reason: RefusalReason, message: z.string() }),
  z.object({ type: z.literal("error"), message: z.string(), retryable: z.boolean() }),
  z.object({ type: z.literal("done"), ms: z.number(), model: z.string() }),
]);
export type GhostEvent = z.infer<typeof GhostEvent>;

export const Version = z.object({
  id: z.number().int(),
  code: z.string(),
  language: Language,
  preset: PresetId.nullable(), // null = the original
  whisper: z.string(),
  changes: z.array(z.string()),
  effects: z.array(z.string()),
});
export type Version = z.infer<typeof Version>;

export const LIMITS = { maxLines: 200, maxChars: 8000, maxComponents: 3 } as const;
