// Effect catalogue: name, description, goodFor, presets, intensityMin. Described to the model.
// Spec: specs/04-effects-and-presets.md §4.1
// Task: T1.6
import type { Intensity, PresetId } from "@/types";

export type EffectTarget = "container" | "heading" | "button" | "text" | "icon";

export interface Effect {
  name: string;
  description: string;
  goodFor: EffectTarget[];
  presets: PresetId[];
  intensityMin: Intensity;
  /** Implemented in effects.css. Effects not yet implemented are never offered to the model. */
  implemented: boolean;
}

export const EFFECTS: readonly Effect[] = [
  {
    name: "ghost-fog",
    description: "Slow drifting fog layer over the element (layered radial gradients). Adds depth without hiding text.",
    goodFor: ["container"],
    presets: ["victorian", "gothic"],
    intensityMin: "haunt",
    implemented: true,
  },
  {
    name: "ghost-flicker",
    description: "Irregular opacity flicker like a dying bulb. Use sparingly on a single heading or logo.",
    goodFor: ["heading", "text"],
    presets: ["victorian", "terminal", "gothic"],
    intensityMin: "whisper",
    implemented: true,
  },
  {
    name: "ghost-candle",
    description: "Warm pulsing glow around the element (box-shadow and text-shadow). Set --ghost-glow to change the colour.",
    goodFor: ["button", "heading", "text"],
    presets: ["victorian", "muertos", "gothic", "jinn"],
    intensityMin: "whisper",
    implemented: true,
  },
  {
    name: "ghost-cobweb-tl",
    description: "SVG cobweb tucked in the top-left corner of the element.",
    goodFor: ["container"],
    presets: ["victorian", "gothic"],
    intensityMin: "haunt",
    implemented: true,
  },
  {
    name: "ghost-cobweb-tr",
    description: "SVG cobweb tucked in the top-right corner of the element.",
    goodFor: ["container"],
    presets: ["victorian", "gothic"],
    intensityMin: "haunt",
    implemented: true,
  },
  {
    name: "ghost-drip",
    description: "Dripping blood-red underline under the text.",
    goodFor: ["heading", "text"],
    presets: ["victorian", "gothic"],
    intensityMin: "possession",
    implemented: true,
  },
  {
    name: "ghost-float",
    description: "Gentle up-and-down levitation on hover.",
    goodFor: ["icon", "button", "container"],
    presets: ["muertos", "jinn"],
    intensityMin: "haunt",
    implemented: true,
  },
  {
    name: "ghost-shiver",
    description: "Tiny trembling shake on hover.",
    goodFor: ["button", "text"],
    presets: ["victorian", "terminal", "gothic"],
    intensityMin: "possession",
    implemented: true,
  },
  {
    name: "ghost-crt",
    description: "Old CRT monitor: scanlines, slightly curved corners, inner vignette and green phosphor text glow.",
    goodFor: ["container"],
    presets: ["terminal"],
    intensityMin: "whisper",
    implemented: true,
  },
  {
    name: "ghost-marigold",
    description: "Border of marigold petals made from a repeating SVG.",
    goodFor: ["container"],
    presets: ["muertos"],
    intensityMin: "haunt",
    implemented: false,
  },
  {
    name: "ghost-papel",
    description: "Papel picado banner strip of cut-paper flags along the top edge.",
    goodFor: ["container"],
    presets: ["muertos"],
    intensityMin: "haunt",
    implemented: false,
  },
  {
    name: "ghost-ornate",
    description: "Victorian ornamental frame: double border, inner hairline and corner brackets.",
    goodFor: ["container"],
    presets: ["victorian"],
    intensityMin: "haunt",
    implemented: true,
  },
  {
    name: "ghost-smoke",
    description: "Wisps of smoke rising from the bottom edge.",
    goodFor: ["container"],
    presets: ["jinn"],
    intensityMin: "haunt",
    implemented: false,
  },
  {
    name: "ghost-glass",
    description: "Stained-glass gradient background in jewel tones.",
    goodFor: ["container"],
    presets: ["gothic"],
    intensityMin: "haunt",
    implemented: false,
  },
  {
    name: "ghost-reveal",
    description: "Text fades in from a blur when the page loads.",
    goodFor: ["heading", "text"],
    presets: ["terminal", "jinn"],
    intensityMin: "whisper",
    implemented: true,
  },
];

const INTENSITY_RANK: Record<Intensity, number> = { whisper: 0, haunt: 1, possession: 2 };

export const EFFECT_NAMES: ReadonlySet<string> = new Set(EFFECTS.map((e) => e.name));

/** Effects the model may use for this preset at this intensity. */
export function effectsFor(preset: PresetId, intensity: Intensity): Effect[] {
  return EFFECTS.filter(
    (e) => e.implemented && e.presets.includes(preset) && INTENSITY_RANK[e.intensityMin] <= INTENSITY_RANK[intensity],
  );
}

/** Catalogue text for the prompt. */
export function describeEffects(preset: PresetId, intensity: Intensity): string {
  return effectsFor(preset, intensity)
    .map((e) => `- ${e.name}: ${e.description} (good for: ${e.goodFor.join(", ")})`)
    .join("\n");
}
