# 03 · Input, size gate and refusals

`src/lib/limits/*`. The same `gate()` runs in the browser (instant feedback) and on the server (authoritative). A refused request never reaches the model.

## 3.1 Language detection (`detect.ts`)

| Signal | Language |
|---|---|
| `import ... from 'react'`, `export default function`, `return (` with tags, `className=` | `jsx` |
| Same + type annotations (`: React.FC`, `interface`, `type X =`, `<Props>`) | `tsx` |
| Starts with a tag, uses `class=`, no JS function wrapper | `html` |
| Otherwise | `unknown` (ask the user to choose) |

## 3.2 The gate (`gate.ts`)

`gate(code, language) → { ok: true, stats } | { ok: false, reason, message, stats }`

Checks, in order:

| # | Check | Reason | Ghost message (pick one at random from a list of 3 per reason) |
|---|---|---|---|
| 1 | Empty or under 20 characters | `empty` | "I sense… nothing. Paste a component and I will possess it." |
| 2 | Over `MAX_LINES` (200) or `MAX_CHARS` (8,000) | `too_big` | "This is beyond my ghostly powers. Bring me one component at a time." |
| 3 | Contains `<!DOCTYPE`, `<html`, `<head`, `<body` | `whole_page` | "A whole house? I only haunt one room at a time." |
| 4 | More than 3 component definitions (JSX) or more than 3 top-level sections (`<header>`, `<main>`, `<footer>`, `<section>`) | `whole_page` | "So many rooms… choose one and I'll haunt it properly." |
| 5 | Routing or data code: `fetch(`, `axios`, `useQuery`, `getServerSideProps`, `"use server"`, `<Route`, SQL keywords | `not_ui` | "I possess interfaces, not their plumbing. Strip it to the component." |
| 6 | No markup at all (no `<tag` and no JSX) | `not_ui` | "There is no body here for me to possess." |
| 7 | Contains `<script src=` or `<iframe` | `unsafe` | "I don't touch other spirits' scripts." |

`stats = { lines, chars, components, language }` drives the size meter (green under 70%, amber 70–100%, red over).

## 3.3 Imports in JSX

- `react` imports are allowed (React is global in the preview).
- Any other import (icons, UI kits, local files) is **stubbed in the preview**: the named imports become placeholder components that render a dashed box with the import name, and a notice says "Some spirits (imports) couldn't cross over to the preview." The ghost keeps the imports in the output code unchanged.

## 3.4 Rate limit (`ratelimit.ts`)

- In-memory token bucket per hashed IP (`x-forwarded-for` on App Platform): `RATE_LIMIT_PER_HOUR` possessions/refinements; `ask` messages count half.
- Over the limit: `refusal` with reason `rate_limited`: "Even ghosts need rest. Return in {minutes} minutes."
- The server order is body check (64 KB cap) → schema → `gate()` → rate limit → model, so gate refusals neither call the model nor spend allowance.
- Note: memory resets on redeploy; acceptable for the challenge (ADR 0003).

## 3.5 Privacy

- Pasted and generated code is never stored or logged. Logs contain only: preset, intensity, language, lines, chars, latency, model, outcome.
