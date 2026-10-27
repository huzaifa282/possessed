# 01 · Requirements

**P0** = must ship · **P1** = if time allows · **P2** = backlog

## User stories

### US-1 · Paste a component (P0)
- **AC-1.1** A code editor accepts a single component in **HTML + CSS** (a fragment with an optional `<style>` block) or **React JSX/TSX with Tailwind classes** (or inline styles / a `<style>` tag).
- **AC-1.2** The language is detected automatically (shown as a badge); the user can override it.
- **AC-1.3** Three built-in samples ("Pricing card", "Login form", "Navbar") load with one click.
- **AC-1.4** The original renders immediately in the "Before" preview (no model call).

### US-2 · The size gate (P0) (spec 03)
- **AC-2.1** Input over the limits (default **200 lines or 8,000 characters**) is refused **before** any model call with an in-character message, e.g. *"This is beyond my ghostly powers. Bring me one component at a time."*
- **AC-2.2** Whole pages are refused even if small: `<!DOCTYPE`, `<html>`, `<head>`, `<body>`, more than 3 component definitions, or routing/data-fetching code.
- **AC-2.3** Non-UI code (no markup or JSX) is refused: *"There is no body here for me to possess."*
- **AC-2.4** The UI shows a live size meter (lines and characters) that turns red near the limit.

### US-3 · Possess it (P0)
- **AC-3.1** The user picks a **preset** (Haunted Victorian, Día de los Muertos, Possessed Terminal, Gothic Cathedral, Jinn's Palace) and an **intensity** (Whisper / Haunt / Full possession).
- **AC-3.2** Toggle "Possess the words too" (off by default): when off, all visible text stays the same.
- **AC-3.3** Pressing **Possess** streams the ghost's short message first, then the code.
- **AC-3.4** The result renders in the "After" preview with a **before/after slider** and a side-by-side mode.
- **AC-3.5** Tabs: **Code** (possessed component, same language as input), **Effects CSS** (only the effect classes used), **Changes** (bullet list from the ghost), **Diff** (vs original).
- **AC-3.6** Copy and download buttons for code and CSS.
- **AC-3.7** If the generated code fails validation, the server retries once with the error; if it fails again, the ghost apologises in character and the user can retry.

### US-4 · Talk to the ghost (P0)
- **AC-4.1** A chat panel with Vesper, the ghost designer. Messages are short (max ~40 words) and in character.
- **AC-4.2** Refinement requests ("less scary", "keep my brand blue", "add fog only to the header") produce a new version from the **latest** version.
- **AC-4.3** Questions ("why did you change the button?") get an answer without new code.
- **AC-4.4** Version history: the user can step back to any earlier version in the session.

### US-5 · Readability check (P1)
- **AC-5.1** After each render, the preview reports text elements whose contrast is below WCAG AA (4.5:1, or 3:1 for large text).
- **AC-5.2** A warning chip ("The spirits made 2 texts hard to read") with a one-click "Fix contrast" refinement.

### US-6 · Model status and limits (P0)
- **AC-6.1** If the model is unavailable or rate-limited, the ghost says so in character and offers Retry; nothing crashes.
- **AC-6.2** Per-IP rate limit (default 20 possessions per hour) with a friendly message.

### US-7 · Scare-o-meter (P1 stretch, spec 11)
- Generate 3 variants; TabPFN predicts which one people will rate scariest; show the score.

### US-8 · Share (P2)
- Share a possession via a link (would require storage; out of scope for the deadline).

## Non-functional requirements

- **NFR-1 Safety:** untrusted code only runs in the sandboxed iframe (spec 05); strict CSP; no network from the iframe.
- **NFR-2 Privacy:** pasted code is not stored or logged (only sizes, preset and timing for metrics). Stated on the page.
- **NFR-3 Cost control:** size gate + rate limit + `maxOutputTokens` cap.
- **NFR-4 Speed:** first ghost words within 5 s; full possession of a 100-line component within 30 s on the Gemini API.
- **NFR-5 Accessibility:** app keyboard-operable; effects honour `prefers-reduced-motion`; app UI contrast AA.
- **NFR-6 Responsive:** works from 1024 px up; mobile shows the editor and preview stacked (chat collapsible).
