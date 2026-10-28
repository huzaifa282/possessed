import type { Preset } from "./types";

export const victorian: Preset = {
  id: "victorian",
  name: "Haunted Victorian",
  mood: "A candlelit parlour in 1890: ink black, aged parchment, oxblood and tarnished gold.",
  palette: {
    bg: "#14100d",
    surface: "#f1e6cf",
    text: "#2a1e14",
    muted: "#6b5a47",
    accent: "#7a1f2b",
    accent2: "#b8923f",
    danger: "#a3262a",
  },
  fonts: {
    display: "'Cinzel', 'IM Fell English', serif",
    body: "'IM Fell English', Georgia, serif",
    mono: "ui-monospace, 'Courier New', monospace",
  },
  effects: {
    whisper: ["ghost-candle"],
    haunt: ["ghost-ornate", "ghost-candle", "ghost-cobweb-tl"],
    possession: ["ghost-ornate", "ghost-candle", "ghost-cobweb-tl", "ghost-cobweb-tr", "ghost-fog", "ghost-flicker"],
  },
  copyStyle: "Formal, archaic and theatrical, like a séance invitation. Keep the meaning of every label and action.",
  dos: [
    "Dark text on parchment surfaces; gold only for borders and accents",
    "Serif display font for headings, body font for everything else",
    "Put ghost-ornate on the outer card, ghost-candle on the primary action",
  ],
  donts: [
    "No gore or blood splatter",
    "Don't put gold text on parchment (low contrast)",
    "Don't stack more than one flicker on a page",
  ],
};
