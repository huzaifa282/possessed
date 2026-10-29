// Preset registry: victorian, muertos, terminal, gothic, jinn.
// Spec: specs/04-effects-and-presets.md §4.2
// Task: T1.6 / T2.8
import type { PresetId } from "@/types";
import type { Preset } from "./types";
import { gothic } from "./gothic";
import { jinn } from "./jinn";
import { muertos } from "./muertos";
import { terminal } from "./terminal";
import { victorian } from "./victorian";

export type { Preset } from "./types";

/** All five presets, in the order the picker shows them. */
export const PRESETS: Partial<Record<PresetId, Preset>> = { victorian, muertos, terminal, gothic, jinn };

export function getPreset(id: PresetId): Preset {
  const p = PRESETS[id];
  if (!p) throw new Error(`Preset "${id}" is not implemented yet`);
  return p;
}
