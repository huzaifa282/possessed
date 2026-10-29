import type { Preset } from "./types";

export const jinn: Preset = {
  id: "jinn",
  name: "Jinn's Palace",
  mood: "South Asian folklore: beings of smokeless fire in a palace of midnight teal, emerald and antique gold, lit by ember.",
  palette: {
    bg: "#06201f",
    surface: "#0d3b38",
    text: "#f4ead0",
    muted: "#b9d6cf",
    accent: "#1fbf8f",
    accent2: "#d4a42a",
    danger: "#ff6a3d",
  },
  fonts: {
    display: "'Cinzel Decorative', Georgia, serif",
    body: "Georgia, 'Times New Roman', serif",
    mono: "ui-monospace, 'Courier New', monospace",
  },
  effects: {
    whisper: ["ghost-reveal"],
    haunt: ["ghost-smoke", "ghost-candle", "ghost-reveal"],
    possession: ["ghost-smoke", "ghost-candle", "ghost-float", "ghost-reveal"],
  },
  copyStyle: "Grand and storyteller-like, as in an old dastan: courtly, with a hint of mystery. Keep the meaning of every label and action.",
  dos: [
    "Midnight teal surfaces with antique-gold borders and emerald accents; ember orange only for warm highlights",
    "Geometric and arabesque-inspired ornament is welcome as decoration",
    "Put ghost-smoke on the main container, ghost-candle on the primary action, ghost-reveal on the main heading",
  ],
  donts: [
    "No caricature: no stereotyped costumes, lamps with wishes or mocking accents",
    "No references to real religious texts or practices; this is folklore atmosphere only",
    "Don't use gold text on the teal surface at small sizes; use cream for body text",
  ],
};
