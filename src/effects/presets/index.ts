// Preset registry: victorian, muertos, terminal, gothic, jinn.
// Spec: specs/04-effects-and-presets.md §4.2
// Task: T1.6 / T2.8
import type { PresetId } from "@/types";
import type { Preset } from "./types";
import { terminal } from "./terminal";
import { victorian } from "./victorian";

export type { Preset } from "./types";

/** Presets implemented so far. muertos, gothic and jinn arrive in T2.8. */
export const PRESETS: Partial<Record<PresetId, Preset>> = { victorian, terminal };

export function getPreset(id: PresetId): Preset {
  const p = PRESETS[id];
  if (!p) throw new Error(`Preset "${id}" is not implemented yet`);
  return p;
}
