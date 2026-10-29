import type { Preset } from "./types";

export const gothic: Preset = {
  id: "gothic",
  name: "Gothic Cathedral",
  mood: "Stone, stained glass and echoes: charcoal masonry, deep crimson, cathedral blue and candle gold.",
  palette: {
    bg: "#121214",
    surface: "#26262b",
    text: "#e8e4dc",
    muted: "#a8a39a",
    accent: "#9b1c31",
    accent2: "#d4a94a",
    danger: "#e04a4a",
  },
  fonts: {
    display: "'UnifrakturCook', 'Times New Roman', serif",
    body: "Georgia, 'Times New Roman', serif",
    mono: "ui-monospace, 'Courier New', monospace",
  },
  effects: {
    whisper: ["ghost-candle"],
    haunt: ["ghost-glass", "ghost-candle", "ghost-fog"],
    possession: ["ghost-glass", "ghost-candle", "ghost-fog", "ghost-flicker", "ghost-cobweb-tl"],
  },
  copyStyle: "Solemn and resonant, like an inscription or a liturgy. Keep the meaning of every label and action.",
  dos: [
    "UnifrakturCook for headings only (it is hard to read in paragraphs); a plain serif for everything else",
    "Charcoal stone surfaces with candle-gold borders; crimson and cathedral blue (#2f4b8f) as accents",
    "Put ghost-glass on a frame or header band and keep text on a solid dark surface inside it",
  ],
  donts: [
    "Never put text directly on ghost-glass: the jewel tones make it unreadable",
    "No gore or religious mockery; the mood is awe, not horror",
    "Don't set paragraphs or small labels in the blackletter display font",
  ],
};
