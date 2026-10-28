# Day 1 · Wed Oct 28: engine + sandbox

Goal: `npm run eval` possesses the sample components with Gemma, and the sandbox renders any HTML or JSX fixture safely.

- [x] **T1.1 · Repo + scaffold check** (spec 00, 02)
  - Create public `huzaifa282/possessed` (Apache 2.0), push this scaffold. `npm install`, `npm run dev`, `npm test` all succeed.
- [ ] **T1.2 · Claim promos** (spec 08)
  - Claim the free .tech domain and any DigitalOcean credit at hacktoberfest.com/my/promos. Note the domain in `decisions/0002-hosting-and-model.md`.
- [x] **T1.3 · Types** (spec 02 "Key types")
  - Finish `src/types/index.ts` Zod schemas. AC: request/event schemas parse sample objects in a test.
- [x] **T1.4 · Language detection + size gate + refusals** (spec 03 §3.1–3.2)
  - `src/lib/limits/detect.ts`, `gate.ts` with refusal message lists. AC: `gate.test.ts`, `detect.test.ts` pass on all fixtures.
- [x] **T1.5 · Fixture components** (spec 09 §9.2)
  - Add the positive and negative fixtures to `tests/fixtures/components/`.
- [x] **T1.6 · Effects catalogue + 2 presets** (spec 04)
  - `catalog.ts` with all effect descriptions; `effects.css` with at least `ghost-fog`, `ghost-candle`, `ghost-flicker`, `ghost-cobweb-*`, `ghost-crt`; presets Victorian + Terminal. AC: effects render in a plain HTML test page; reduced motion respected.
- [ ] **T1.7 · Model provider (Gemma via Gemini API)** (spec 07 §7.1)
  - Streaming, thought-part skipping, retries, model switch. AC: a script streams a short Gemma reply.
- [x] **T1.8 · Prompt + streaming parser + validation** (spec 06 §6.3–6.6)
  - `prompt.ts`, `parse.ts`, `validate.ts`, `possess.ts` with one retry. AC: `parse.test.ts`, `validate.test.ts` pass.
- [ ] **T1.9 · `npm run eval` (first pass)** (spec 09 §9.3)
  - Possess each positive fixture in Victorian + Terminal; write outputs + summary to `tasks/notes.md`.
- [ ] **T1.10 · Preview sandbox** (spec 05 §5.1–5.3)
  - `scripts/copy-vendor.ts` (React 18 UMD, sucrase, tailwind browser, effects.css, fonts), `srcdoc.ts`, a bare `PreviewFrame.tsx`. AC: `srcdoc.test.ts` passes; HTML and JSX fixtures render; the malicious cases in spec 09 §9.4 can't escape.

## Notes

- T1.1: tests, typecheck, lint pass; dev serves 200 on :3000; LICENSE Apache 2.0; pushed to https://github.com/huzaifa282/possessed (main).
- T1.2 skipped for now: needs the user to claim promos (claims use up inventory). Come back to it.
- T1.3: schemas already matched spec 02; added `tests/types.test.ts` (request/event/version parsing + limits).
- T1.5 done before T1.4 because the gate tests need the fixtures. `guideme-sidepanel.html` is a stand-in; swap in the real GuideMe panel before recording the demo. `huge-dashboard.jsx` is 268 lines. Fixtures are excluded from ESLint.
- T1.4: `detect.ts`, `gate.ts` (3 refusal messages per reason, rule-6 message folded into `not_ui`), `tests/limits.test.ts` (36 tests total pass). `gate()` accepts `unknown` as a language; `<header>` is not mistaken for `<head>`; SQL keywords are matched uppercase only to avoid flagging prose.
- T1.6: `catalog.ts` describes all 15 effect classes from spec 04; CSS is implemented for 11 (everything except marigold, papel, smoke, glass, which arrive with their presets in T2.8) and the catalogue never offers unimplemented ones to the model (`effectsFor`). Presets: Victorian + Terminal. `docs/effects-demo.html` checked in Chrome (served over HTTP). Reduced motion is covered by a test, not eyeballed. `tests/effects.test.ts` keeps catalogue, CSS and presets consistent.
- T1.7 (built, live check pending): `provider.ts` (interface, `ProviderError`, `createProvider`) and `gemini-gemma.ts` (SSE streaming, thought parts skipped, no `responseMimeType`, retries 1 s/3 s, model switch on 429 or after 2 failures, 60 s budget, 20 s first-chunk timeout, no retry once text has been emitted). 15 mocked-fetch tests pass. AC needs a real key: put `GEMINI_API_KEY` in `.env.local` and run `npm run model:ping`, then tick this.
- T1.8: `prompt.ts`, `parse.ts` (streaming state machine), `validate.ts`, `possess.ts` (gate → stream → parse → validate → one retry; the whisper streams live and is not repeated on retry). Tests: `parse`, `validate`, `possess` (fake provider). Spec 06 §6.5 amended: a `refine` reply with no `<code>` is valid (it contradicted §6.2). HTML structure check ignores `<style>`/`<script>`/`<link>` so the one allowed `<style>` block does not count. Shared `SUCRASE_OPTIONS` now lives in `preview/transform.ts` (T1.10 builds on it). `getPreset` throws for presets not built yet (muertos, gothic, jinn → T2.8).
- T1.9 (built, live run pending): `scripts/eval-ghost.ts` possesses each positive fixture × each implemented preset (`--presets=`, `--only=`, `--intensity=` flags), counts model calls to detect retries, writes outputs to `tests/eval-out/` (gitignored) and replaces the marked eval section in this file. Needs `GEMINI_API_KEY` in `.env.local`; tick after the first real run.
