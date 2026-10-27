# Day 2 · Thu Oct 29: the studio + deploy

Goal: the full flow works in the browser and is live on DigitalOcean.

- [ ] **T2.1 · API route `/api/possess` (SSE) + `/api/health`** (spec 06, 07, 03 §3.4)
  - Gate → rate limit → possess/refine/ask → SSE `GhostEvent`s. AC: curl streams whisper then code; oversized input returns a refusal with no model call.
- [ ] **T2.2 · Editor** (spec 01 US-1, US-2)
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
