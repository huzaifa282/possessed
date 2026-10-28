// Preset shape. Spec: specs/04-effects-and-presets.md §4.2
import type { Intensity, PresetId } from "@/types";

export interface Preset {
  id: PresetId;
  name: string;
  /** One line for the prompt. */
  mood: string;
  palette: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accent2: string;
    danger: string;
  };
  fonts: { display: string; body: string; mono: string };
  /** Effect classes to use at each intensity (counts follow spec 04 §4.3). */
  effects: Record<Intensity, string[]>;
  /** How to rewrite words when "possess the words" is on. */
  copyStyle: string;
  dos: string[];
  donts: string[];
}
