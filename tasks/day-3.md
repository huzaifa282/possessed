# Day 3 · Fri Oct 30: polish, prove, capture

Goal: it looks excellent, numbers are measured, assets are captured, the post is drafted.

- [ ] **T3.1 · Eval pass ≥ 90%** (spec 09 §9.3)
  - Run eval across all presets; tune prompt/effects until ≥ 90% pass without retry. Record numbers in `tasks/notes.md`.
- [x] **T3.2 · Contrast report + "Fix contrast"** (spec 05 §5.5, spec 01 US-5) · P1
- [x] **T3.3 · .tech domain live** (spec 08 §8.2): dropped, see ADR 0002
- [ ] **T3.4 · Manual checklist on the live site** (spec 09 §9.4)
- [ ] **T3.5 · Scare-o-meter** (spec 11) · stretch; apply the cut rule at 18:00 PKT
- [ ] **T3.6 · Capture assets** (spec 10 §10.2)
- [ ] **T3.7 · README** (hero GIF, live link, how it works, safety, limits, license)
- [ ] **T3.8 · Post first draft in `docs/post-draft.md`** (spec 10 §10.3)

## Notes
- T3.2: `lib/a11y/contrast.ts` holds the WCAG maths and the in-frame measurer as one self-contained `createContrastKit()`, so the frame script is its own source text (`contrastFrameScript()`) and tests run the same code. Colours the browser reports as oklch (Tailwind v4) are read through a 1px canvas. Frame posts `{type:"contrast", failures, unmeasured}` 700 ms after `ready`; the parent validates it (`messages.ts`). Texts over a gradient, an image or an all-transparent backdrop are counted as `unmeasured`, not failed (the studio decides what is behind a transparent frame). Ancestor opacity is folded into the text colour. `Studio.tsx` shows "The spirits made N texts hard to read" with **Fix contrast**, which sends a normal refinement naming up to 4 offenders with ratios; the chip only shows for the selected version. Checked in Chrome against a snippet (oklch, gradient, large and small text): 3 failures and 1 unmeasured, as expected. Not checked end to end through a live possession. The eval's contrast column stays "not wired" because the eval has no browser; use the manual checklist. 10 new tests, 197 pass.
