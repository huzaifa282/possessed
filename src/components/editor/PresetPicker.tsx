// Presets, intensity, 'possess the words too' toggle.
// Spec: specs/04 §4.2–4.3
// Task: T2.3

"use client";

import { PRESETS } from "@/effects/presets";
import { Intensity, PresetId } from "@/types";

export const INTENSITY_LABELS: Record<Intensity, { label: string; hint: string }> = {
  whisper: { label: "Whisper", hint: "1–2 subtle effects, palette shift, layout kept" },
  haunt: { label: "Haunt", hint: "2–4 effects, full palette and fonts" },
  possession: { label: "Full possession", hint: "3–6 layered effects, dramatic" },
};

interface Props {
  preset: PresetId;
  onPresetChange: (preset: PresetId) => void;
  intensity: Intensity;
  onIntensityChange: (intensity: Intensity) => void;
  possessWords: boolean;
  onPossessWordsChange: (on: boolean) => void;
  disabled?: boolean;
}

export default function PresetPicker(props: Props) {
  const { preset, intensity, possessWords, disabled } = props;
  const presets = Object.values(PRESETS);

  return (
    <section aria-label="Possession settings" className="flex flex-col gap-4">
      <fieldset disabled={disabled} className="flex flex-col gap-2">
        <legend className="mb-1 text-sm text-ink/70">Style</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {presets.map((p) => {
            const selected = p.id === preset;
            return (
              <label
                key={p.id}
                className={`cursor-pointer rounded border p-3 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-spirit ${
                  selected ? "border-glow bg-wood-light" : "border-wood-light bg-wood-dark hover:border-glow/60"
                }`}
              >
                <input
                  type="radio"
                  name="preset"
                  value={p.id}
                  checked={selected}
                  onChange={() => props.onPresetChange(PresetId.parse(p.id))}
                  className="sr-only"
                />
                <span className="flex items-center gap-2">
                  <span className="flex" aria-hidden="true">
                    {[p.palette.bg, p.palette.surface, p.palette.accent, p.palette.accent2].map((c) => (
                      <span key={c} className="h-4 w-4 border border-black/40 first:rounded-l last:rounded-r" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="font-semibold">{p.name}</span>
                </span>
                <span className="mt-1 block text-xs text-ink/70">{p.mood}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset disabled={disabled} className="flex flex-col gap-2">
        <legend className="mb-1 text-sm text-ink/70">Intensity</legend>
        <div className="flex overflow-hidden rounded border border-wood-light">
          {Intensity.options.map((level) => {
            const selected = level === intensity;
            return (
              <label
                key={level}
                title={INTENSITY_LABELS[level].hint}
                className={`flex-1 cursor-pointer px-3 py-2 text-center text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-spirit ${
                  selected ? "bg-glow text-room" : "bg-wood-dark hover:bg-wood-light"
                }`}
              >
                <input
                  type="radio"
                  name="intensity"
                  value={level}
                  checked={selected}
                  onChange={() => props.onIntensityChange(level)}
                  className="sr-only"
                />
                {INTENSITY_LABELS[level].label}
              </label>
            );
          })}
        </div>
        <p className="text-xs text-ink/70">{INTENSITY_LABELS[intensity].hint}</p>
      </fieldset>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={possessWords}
          disabled={disabled}
          onChange={(e) => props.onPossessWordsChange(e.target.checked)}
          className="mt-1 accent-[var(--glow)]"
        />
        <span>
          Possess the words too
          <span className="block text-xs text-ink/70">Off: every visible word stays exactly as written. On: the ghost may rewrite the copy.</span>
        </span>
      </label>
    </section>
  );
}
