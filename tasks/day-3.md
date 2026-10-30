# Day 3 · Fri Oct 30: polish, prove, capture

Goal: it looks excellent, numbers are measured, assets are captured, the post is drafted.

- [x] **T3.1 · Eval pass ≥ 90%** (spec 09 §9.3)
  - Run eval across all presets; tune prompt/effects until ≥ 90% pass without retry. Record numbers in `tasks/notes.md`.
- [x] **T3.2 · Contrast report + "Fix contrast"** (spec 05 §5.5, spec 01 US-5) · P1
- [x] **T3.3 · .tech domain live** (spec 08 §8.2): dropped, see ADR 0002
- [ ] **T3.4 · Manual checklist on the live site** (spec 09 §9.4)
- [ ] **T3.5 · Scare-o-meter** (spec 11) · stretch; apply the cut rule at 18:00 PKT
- [ ] **T3.6 · Capture assets** (spec 10 §10.2)
- [ ] **T3.7 · README** (hero GIF, live link, how it works, safety, limits, license)
- [x] **T3.8 · Post first draft in `docs/post-draft.md`** (spec 10 §10.3)

## Notes
- T3.2: `lib/a11y/contrast.ts` holds the WCAG maths and the in-frame measurer as one self-contained `createContrastKit()`, so the frame script is its own source text (`contrastFrameScript()`) and tests run the same code. Colours the browser reports as oklch (Tailwind v4) are read through a 1px canvas. Frame posts `{type:"contrast", failures, unmeasured}` 700 ms after `ready`; the parent validates it (`messages.ts`). Texts over a gradient, an image or an all-transparent backdrop are counted as `unmeasured`, not failed (the studio decides what is behind a transparent frame). Ancestor opacity is folded into the text colour. `Studio.tsx` shows "The spirits made N texts hard to read" with **Fix contrast**, which sends a normal refinement naming up to 4 offenders with ratios; the chip only shows for the selected version. Checked in Chrome against a snippet (oklch, gradient, large and small text): 3 failures and 1 unmeasured, as expected. Not checked end to end through a live possession. The eval's contrast column stays "not wired" because the eval has no browser; use the manual checklist. 10 new tests, 197 pass.
- T3.1: full eval, 5 fixtures × 5 presets at "haunt" on `gemma-4-26b-a4b-it`: **23/25 (92%) passed without retry**, 1 passed after one retry (pricing-card × muertos), 1 failed (pricing-card × victorian: 2 calls, 74 s, "the spell slipped"). Meets the 90% target but with no margin: one more failure would drop it to 88%. Average latency 21.8 s. The failure was not diagnosed; the same pair passed in the earlier 10-run eval, so it looks like model flakiness rather than a prompt gap, but I did not re-run it. Full table in `tasks/notes.md`; outputs in `tests/eval-out/`. The contrast column is not part of the eval (no browser), see T3.2.
- T3.7 (in progress, not ticked): README rewritten (how it works, safety, accessibility, numbers, limits, dev commands). Still missing the hero GIF (T3.6) and the live link (T2.7); both are marked with TODO comments.
- T3.8: first draft in `docs/post-draft.md` following spec 10 §10.3. Numbers used are only the measured ones (eval 92%, 21.8 s average, first live run 111 s, later about 48 s). Tokens per possession is not measured and is listed as an open item at the top of the draft, as are the live link, assets, the exact challenge template line, and whether the "agency" hook is the real story.
