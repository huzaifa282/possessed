# 04 · Effects library and presets

The polish lives here, hand-written, so the model's job is to **choose and apply**, not to invent CSS. All effect classes are prefixed `ghost-`, live in `src/effects/effects.css`, are pure CSS (no JS), and respect `prefers-reduced-motion` (animations off, static look kept).

## 4.1 Effects catalogue (`catalog.ts` describes each one to the model)

| Class | What it does | Use on |
|---|---|---|
| `ghost-fog` | Slow drifting fog layer (layered radial gradients, `::before`) | Containers, cards, heroes |
| `ghost-flicker` | Irregular opacity flicker like a dying bulb | Headings, logos |
| `ghost-candle` | Warm pulsing glow (box-shadow / text-shadow) | Buttons, badges, prices |
| `ghost-cobweb-tl` / `ghost-cobweb-tr` | SVG cobweb in a corner (data-URI background, `::after`) | Cards, panels |
| `ghost-drip` | Dripping underline on text | Headings, links |
| `ghost-float` | Gentle up-down hover, like it's levitating | Icons, avatars, CTAs |
| `ghost-shiver` | Tiny shake on hover | Buttons, links |
| `ghost-crt` | Scanlines + slight curvature + green phosphor glow | Terminal preset containers |
| `ghost-marigold` | Border of marigold petals (repeating SVG) | Muertos cards, frames |
| `ghost-papel` | Papel picado banner strip along the top (SVG, cut-paper pattern) | Muertos headers |
| `ghost-ornate` | Victorian ornamental frame (double border + corner flourishes) | Victorian cards |
| `ghost-smoke` | Rising smoke wisps from the bottom edge | Jinn containers |
| `ghost-glass` | Stained-glass gradient background | Gothic panels |
| `ghost-reveal` | Text fades in from blur on load | Headings |

Each entry in `catalog.ts`: `{ name, description, goodFor: ["container"|"heading"|"button"|"text"|"icon"], presets: PresetId[], intensityMin: Intensity }`.

## 4.2 Presets (`presets/*.ts`)

Each preset: `{ id, name, mood (one line for the prompt), palette: { bg, surface, text, muted, accent, accent2, danger }, fonts: { display, body, mono }, effects: { whisper: [], haunt: [], possession: [] }, copyStyle (how to rewrite words if allowed), dos: string[], donts: string[] }`.

| Preset | Mood | Palette idea | Display font | Signature effects |
|---|---|---|---|---|
| **Haunted Victorian** | A candlelit parlour in 1890 | ink black, aged parchment, oxblood, tarnished gold | Cinzel / IM Fell English | `ghost-ornate`, `ghost-candle`, `ghost-cobweb-*`, `ghost-fog` |
| **Día de los Muertos** | A joyful, colourful remembrance, never mocking | deep violet night, marigold orange, magenta, turquoise, bone white | Rye or a bold slab | `ghost-papel`, `ghost-marigold`, `ghost-candle`, `ghost-float` |
| **Possessed Terminal** | A 1983 terminal that's alive | black, phosphor green, amber warnings | VT323 | `ghost-crt`, `ghost-flicker`, `ghost-reveal` |
| **Gothic Cathedral** | Stone, stained glass, echoes | charcoal stone, deep crimson, cathedral blue, candle gold | UnifrakturCook (display only) | `ghost-glass`, `ghost-candle`, `ghost-fog` |
| **Jinn's Palace** | South Asian folklore: smokeless fire, emerald and gold | midnight teal, emerald, antique gold, ember | Cinzel Decorative | `ghost-smoke`, `ghost-candle`, `ghost-float`, `ghost-reveal` |

**Día de los Muertos guidance (in `dos`/`donts`):** celebrate memory and family; marigolds, candles, papel picado, sugar-skull motifs as decoration; no blood, no horror, no "costume" stereotypes.

## 4.3 Intensity

| Level | Effects allowed | Colour change | Copy |
|---|---|---|---|
| Whisper | 1–2 subtle effects | Palette shift, keep layout | Unchanged |
| Haunt | 2–4 effects | Full preset palette and fonts | Unchanged unless "possess the words" |
| Full possession | 3–6 effects, layered | Full preset, dramatic | Rewritten if "possess the words" |

## 4.4 Fonts

All fonts are open-licensed (OFL) and self-hosted via `@fontsource/*` for the app and the preview. The **Effects CSS** tab output includes `@import` lines for the matching `@fontsource` packages and a one-line install hint, so the code works in the user's project.
