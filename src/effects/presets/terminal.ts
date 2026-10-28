import type { Preset } from "./types";

export const terminal: Preset = {
  id: "terminal",
  name: "Possessed Terminal",
  mood: "A 1983 terminal that is alive: black glass, phosphor green, amber warnings.",
  palette: {
    bg: "#050805",
    surface: "#0b130b",
    text: "#6cff7a",
    muted: "#3fae4a",
    accent: "#9dff9d",
    accent2: "#ffb000",
    danger: "#ff4d3d",
  },
  fonts: {
    display: "'VT323', ui-monospace, monospace",
    body: "'VT323', ui-monospace, monospace",
    mono: "'VT323', ui-monospace, monospace",
  },
  effects: {
    whisper: ["ghost-flicker"],
    haunt: ["ghost-crt", "ghost-flicker", "ghost-reveal"],
    possession: ["ghost-crt", "ghost-flicker", "ghost-reveal", "ghost-shiver"],
  },
  copyStyle: "Terse command-line voice: prompts like '> ', status lines, ALL-CAPS labels. Keep the meaning of every label and action.",
  dos: [
    "Monospace everywhere; VT323 is large, so bump font sizes up one step",
    "Put ghost-crt on the outer container only",
    "Use amber for warnings and focus rings, red only for errors",
  ],
  donts: [
    "No rounded pill buttons or soft shadows; keep edges square",
    "Don't use muted green for body text on a green surface",
    "Don't apply ghost-crt to more than one nested element",
  ],
};
