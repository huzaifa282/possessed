# Day 2 · Thu Oct 29: the studio + deploy

Goal: the full flow works in the browser and is live on DigitalOcean.

- [x] **T2.1 · API route `/api/possess` (SSE) + `/api/health`** (spec 06, 07, 03 §3.4)
  - Gate → rate limit → possess/refine/ask → SSE `GhostEvent`s. AC: curl streams whisper then code; oversized input returns a refusal with no model call.
- [x] **T2.2 · Editor** (spec 01 US-1, US-2)
  - CodeMirror, language badge + override, size meter, 3 samples, instant client-side refusal.
- [ ] **T2.3 · Preset picker** (spec 04 §4.2–4.3)
  - Presets, intensity, "possess the words too".
- [ ] **T2.4 · Before/after preview + output tabs** (spec 05 §5.4, spec 01 AC-3.4–3.6)
  - Slider + side-by-side, background toggle; tabs Code / Effects CSS / Changes / Diff; copy + download.
- [ ] **T2.5 · Ghost chat + versions** (spec 06 §6.2, §6.7, spec 01 US-4)
  - Vesper messages stream; refine vs ask; version history.
- [ ] **T2.6 · Ghost avatar + page layout** (spec 01 NFR-6)
  - Haunted studio layout (editor | preview | chat), animated ghost states (idle, thinking, speaking, refusing), mobile stacking.
- [ ] **T2.7 · Deploy to DigitalOcean App Platform** (spec 08 §8.1, §8.4)
  - Live URL, env vars set, production checks ticked.
- [ ] **T2.8 · Remaining presets** (spec 04)
  - Día de los Muertos (with the respect guidance), Gothic Cathedral, Jinn's Palace + their signature effects.

## Notes

- T2.1: `/api/possess` streams `GhostEvent`s as SSE (`src/lib/ghost/sse.ts` has `encodeSse` plus a `parseSse` for the browser client in T2.2/T2.5). Order is body check (64 KB cap, 413) → Zod (400) → gate → rate limit → provider, so refusals cost no model call and no rate-limit allowance. `ratelimit.ts` is a token bucket per hashed IP (ask costs 0.5, epsilon guards float drift so a "retry in N" answer is honoured). `model/runtime.ts` holds the process-wide provider (so the 31B → 26B switch sticks), limiter and last latency. `/api/health` returns 503 when the provider is not ok, so the App Platform check is honest. One metadata-only log line per request (spec 03 §3.5; a test asserts the code is never logged). 12 new tests (`ratelimit`, `api`); 142 pass. Live curl: oversized fixture → immediate `too_big` refusal, pricing card → whisper, code, changes, effects, done. **Watch:** that live run took 111 s on `gemma-4-26b-a4b-it` (eval averaged 17.5 s); the time is inside the model call. Check the 31B-first timeout/fallback behaviour before the T2.7 deploy.
- T2.2: `CodeEditor.tsx` (CodeMirror 6, HTML or JS/TS/JSX highlighting by language) is a controlled component: `value`, `language` override (`null` = auto), callbacks. It shows the detected-language badge ("JSX · auto") with an override select, the size meter (green under 70%, amber 70–100%, red over; `role="meter"`), and three sample buttons. Gate refusals appear instantly in character (an empty box shows none, and the wording is fixed per mount so it doesn't flicker per keystroke). Logic lives in `src/lib/limits/analyze.ts` so the page can reuse it to enable the Possess button in T2.3. `src/lib/samples.ts` is generated from the fixtures and `tests/samples.test.ts` fails if they drift. Checked in Chrome: Pricing card (JSX, 24 lines, meter green), Login form (HTML badge), a pasted whole page gets a refusal immediately. Not clicked in the browser: the language override select (covered by the `analyze` unit test). `page.tsx` is a temporary client page holding the editor state; T2.6 replaces it with the real layout. 9 new tests, 151 pass. AC-1.4 (original in the Before preview) belongs to T2.4.
