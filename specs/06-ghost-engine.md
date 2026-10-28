# 06 · The ghost engine (prompting, output contract, validation, chat)

`src/lib/ghost/*` and `src/app/api/possess/route.ts`.

## 6.1 Persona: Vesper

A ghost designer who has haunted design studios since the days of letterpress. Dry, slightly theatrical, helpful. Speaks in short lines (max ~40 words), never mean about the user's code, occasionally references design history. Never claims to be human; never breaks the safety rules.

## 6.2 Modes

| Mode | Input | Output |
|---|---|---|
| `possess` | original code + preset + intensity + possessWords | whisper + code + changes + effects |
| `refine` | latest possessed code + user message + last 6 chat turns | whisper + new code + changes + effects |
| `ask` | latest code + user message + last 6 chat turns | whisper only (no code) |

The client picks `refine` vs `ask` with a simple rule (question mark and no imperative verb = ask); the model may still return no `<code>` for `refine` if nothing should change, and the UI handles that.

## 6.3 Output contract

```
<whisper>One to three short sentences in Vesper's voice.</whisper>
<code lang="jsx">
...the full possessed component...
</code>
<changes>
- Swapped the palette to Haunted Victorian (parchment on ink)
- Added ghost-ornate to the card and ghost-candle to the button
</changes>
<effects>ghost-ornate, ghost-candle</effects>
```

- `<whisper>` comes **first** so the UI can stream the voice while the code is generated.
- `lang` must equal the input language.
- For `ask`, only `<whisper>`.

## 6.4 System prompt (template in `prompt.ts`, key rules)

1. You are Vesper (persona above).
2. Re-theme the given component in the **{preset.name}** style: {preset.mood}. Palette: {palette}. Fonts: {fonts}. Intensity: {intensity rules from spec 04 §4.3}.
3. **Preserve:** component name, exports, props and their usage, element structure and order, event handlers, accessibility attributes, and all visible text {unless possessWords}.
4. **Use only these effect classes** where they fit: {catalog entries for this preset, name + description + goodFor}. Do not write new keyframes or large CSS. Small inline styles and Tailwind classes for colour, font and spacing are fine.
5. For HTML input: you may add one small `<style>` block for palette variables and font-family only.
6. For JSX: keep Tailwind if the input used Tailwind; otherwise use inline styles or a `<style>` tag, matching the input's approach.
7. Keep text readable: body text contrast at least 4.5:1 against its background.
8. {Preset dos and don'ts, including the Día de los Muertos guidance.}
9. Output exactly the contract in 6.3. No markdown fences, nothing outside the tags.

User message: the code (for `possess`), or the latest version plus "The user says: {message}" (for `refine`/`ask`), plus recent chat turns.

Generation config: `temperature 0.7` (possess), `0.4` (refine), `maxOutputTokens 4096`; Gemini thinking minimal.

## 6.5 Streaming parser (`parse.ts`)

State machine over chunks: `preamble → whisper → between → code → changes → effects → done`.
- Emits `whisper` deltas live.
- Buffers code until `</code>` (code must be complete before rendering).
- Tolerates: markdown fences around or inside `<code>`, missing `</effects>`, a missing `lang` attribute (falls back to input language), tags split across chunks.
- If the stream ends without `<code>` in `possess`, or inside an unterminated `<code>` in `possess`/`refine`: validation failure → retry (6.6). A `refine` reply with a whisper and no `<code>` at all is valid ("nothing to change", see 6.2).

## 6.6 Validation and retry (`validate.ts`)

1. **Language match** with the input.
2. **Parse check:** JSX/TSX through Sucrase (server-side, same options as the preview); HTML through `parse5` (must parse, no `<script src>`, no `<iframe>`).
3. **Structure check (light):** component name and default export unchanged (JSX); number of top-level elements within ±20% (HTML).
4. **Effects check:** every `ghost-*` class used exists in the catalogue; unknown ones are stripped and noted.
5. **Text preservation** (when possessWords is off): visible text tokens of the original must still appear (≥ 90% match); otherwise retry.
6. On failure: **one** retry with the error appended ("Your previous code failed: {error}. Return the full component again."). Second failure → `error` event with an in-character apology and `retryable: true`.

## 6.7 Versions

The client keeps `versions[]` (original + each possession/refinement with whisper, code, changes, effects, preset). Refinements always start from the selected version. Nothing is stored server-side.
