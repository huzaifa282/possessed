// System + user prompt builders for possess / refine / ask.
// Spec: specs/06-ghost-engine.md §6.1, §6.4
// Task: T1.8
import { describeEffects } from "@/effects/catalog";
import type { Preset } from "@/effects/presets";
import type { Intensity, Language, PossessRequest } from "@/types";

export const INTENSITY_RULES: Record<Intensity, string> = {
  whisper: "Whisper: use 1-2 subtle effects. Shift the palette but keep the layout. Do not change any text.",
  haunt: "Haunt: use 2-4 effects. Apply the full preset palette and fonts.",
  possession:
    "Full possession: use 3-6 layered effects. Apply the full preset palette and fonts, dramatically.",
};

export const TEMPERATURE = { possess: 0.7, refine: 0.4, ask: 0.4 } as const;
export const MAX_OUTPUT_TOKENS = 4096;

const PERSONA = `You are Vesper, a ghost designer who has haunted design studios since the days of letterpress. You are dry, slightly theatrical and helpful. You speak in short lines (at most about 40 words), are never mean about the user's code, and occasionally reference design history. You never claim to be human and you never break the safety rules.`;

const CONTRACT = `Reply with exactly this format and nothing else (no markdown fences, nothing outside the tags):
<whisper>One to three short sentences in Vesper's voice.</whisper>
<code lang="{lang}">
...the full possessed component...
</code>
<changes>
- One short bullet per change
</changes>
<effects>comma-separated ghost- classes you used</effects>
The <whisper> block must come first. lang must be "{lang}".`;

const ASK_CONTRACT = `The user is asking a question, not requesting a change. Reply with only <whisper>...</whisper> (one to three short sentences in Vesper's voice). Do not return code.`;

export interface PromptInput {
  req: PossessRequest;
  preset: Preset;
}

export function buildSystemPrompt({ req, preset }: PromptInput): string {
  const { palette, fonts } = preset;
  const effects = describeEffects(preset.id, req.intensity);
  const words = req.possessWords
    ? `You may also rewrite the visible text in this style: ${preset.copyStyle} Keep the meaning of every label and action.`
    : "Keep all visible text exactly as it is.";

  const rules = [
    PERSONA,
    `Re-theme the given component in the ${preset.name} style: ${preset.mood}`,
    `Palette: bg ${palette.bg}, surface ${palette.surface}, text ${palette.text}, muted ${palette.muted}, accent ${palette.accent}, accent2 ${palette.accent2}, danger ${palette.danger}. Fonts: display ${fonts.display}; body ${fonts.body}; mono ${fonts.mono}.`,
    `Intensity: ${INTENSITY_RULES[req.intensity]}`,
    `Preserve the component name, exports, props and their usage, element structure and order, event handlers and accessibility attributes. ${words}`,
    `Use only these effect classes, where they fit. Do not write new keyframes or large CSS. Small inline styles and Tailwind classes for colour, font and spacing are fine.\n${effects}`,
    languageRule(req.language),
    "Keep text readable: body text contrast must be at least 4.5:1 against its background.",
    `Do:\n${preset.dos.map((d) => `- ${d}`).join("\n")}\nDon't:\n${preset.donts.map((d) => `- ${d}`).join("\n")}`,
    req.mode === "ask" ? ASK_CONTRACT : CONTRACT.replaceAll("{lang}", req.language),
  ];
  return rules.join("\n\n");
}

function languageRule(lang: Language): string {
  if (lang === "html") {
    return "The input is an HTML fragment. You may add one small <style> block for palette variables and font-family only. Never add <script src> or <iframe>.";
  }
  return "The input is a React component. Keep Tailwind if the input used Tailwind; otherwise use inline styles or a <style> tag, matching the input's approach. Keep the same exports.";
}

export function buildUserPrompt(req: PossessRequest, retryError?: string): string {
  const parts: string[] = [];
  if (req.mode === "possess") {
    parts.push(`Possess this component:\n${req.code}`);
  } else {
    parts.push(`Here is the latest version of the component:\n${req.code}`);
    if (req.history.length) {
      parts.push(`Recent conversation:\n${req.history.map((t) => `${t.role === "user" ? "User" : "Vesper"}: ${t.text}`).join("\n")}`);
    }
    parts.push(`The user says: ${req.message ?? ""}`);
  }
  if (retryError) parts.push(`Your previous code failed: ${retryError} Return the full component again.`);
  return parts.join("\n\n");
}
