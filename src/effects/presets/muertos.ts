import type { Preset } from "./types";

export const muertos: Preset = {
  id: "muertos",
  name: "Día de los Muertos",
  mood: "A joyful, colourful remembrance of loved ones: a deep violet night glowing with marigold, magenta and turquoise. Warm and celebratory, never mocking.",
  palette: {
    bg: "#1b0b30",
    surface: "#2a1048",
    text: "#fff4dd",
    muted: "#d9c7f0",
    accent: "#ff9a1f",
    accent2: "#e6007e",
    danger: "#ff6b6b",
  },
  fonts: {
    display: "'Rye', Georgia, serif",
    body: "ui-sans-serif, system-ui, 'Segoe UI', sans-serif",
    mono: "ui-monospace, 'Courier New', monospace",
  },
  effects: {
    whisper: ["ghost-candle"],
    haunt: ["ghost-papel", "ghost-marigold", "ghost-candle"],
    possession: ["ghost-papel", "ghost-marigold", "ghost-candle", "ghost-float"],
  },
  copyStyle: "Warm, affectionate and celebratory, as if inviting family to an ofrenda. Remembering, not frightening. Keep the meaning of every label and action.",
  dos: [
    "Celebrate memory and family: marigolds (cempasúchil), candles, papel picado and sugar-skull motifs are decoration, used with warmth",
    "Bright, saturated accents (marigold orange, magenta, turquoise) on a deep violet night with bone-white text",
    "Put ghost-papel on the top container, ghost-marigold on the main card, ghost-candle on the primary action",
  ],
  donts: [
    "No blood, gore or horror imagery: this is a celebration, not a scare",
    "No costume stereotypes (no sombreros, ponchos or caricatured accents) and no mocking of death or the tradition",
    "Don't put orange or magenta text on the violet surface at small sizes (low contrast); use bone white for body text",
  ],
};
