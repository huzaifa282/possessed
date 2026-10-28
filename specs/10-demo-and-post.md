# 10 · Demo and DEV post

**Writing quality is weighted most heavily.** The post is the main deliverable; the live site is its proof.

## 10.1 Demo components (all yours, no third-party branding)

1. **GuideMe's side panel** (from your Hack Day project): possessed into Jinn's Palace. Continuity with your story.
2. **A pricing card**: Haunted Victorian (prices in candlelight).
3. **A login form**: Possessed Terminal ("ACCESS GRANTED… for now").
4. **A profile card**: Día de los Muertos, done respectfully.
5. **The refusal:** paste a whole page → "This is beyond my ghostly powers."

## 10.2 Assets (`docs/assets/`)

- [ ] `hero.gif`: before/after slider dragged across a possessed pricing card (8–12 s, ≤ 8 MB)
- [ ] `presets.png`: one component in all 5 presets (grid)
- [ ] `chat.gif`: "less scary" refinement in the chat
- [ ] `refusal.png`: the ghost refusing a whole page
- [ ] `cover.png`: 1000 × 420 DEV cover
- [ ] 60–90 s video (unlisted YouTube): paste → possess → slider → refine → copy code → refusal

## 10.3 Post outline (challenge template)

**Title options**
- "I hired a ghost to do my agency's Halloween redesigns"
- "Possessed: paste any UI component, a ghost designer haunts it (open-weight Gemma on DigitalOcean)"

**Tags:** `#devchallenge #hf26challenge #webdev #opensource`

1. **Hook:** every October clients ask for a spooky version of their site; it eats a week. 2–3 lines + hero GIF.
2. **What I Built:** paste one component → possessed code + live preview + a ghost you can talk to. Presets grid. The refusal as personality *and* cost control.
3. **Demo:** live link + video + "try these samples".
4. **Code:** `{% github huzaifa282/possessed %}`
5. **How I Built It:** pipeline diagram (gate → Gemma → streaming parser → validation/retry → sandboxed preview). The key design choice: a hand-made effects library so a small open model *chooses* effects instead of inventing CSS. Safety of running untrusted code. Real numbers: possession latency, validation pass rate from the eval, tokens per possession.
6. **Why Does Open Innovation Matter?:** concrete:
   - Agency code is client code. With an open model you can run it on infrastructure you control (the DigitalOcean GPU Droplet option is one env var away) instead of sending it to a closed API.
   - Open weights mean predictable cost and no deprecation surprise in the middle of a campaign.
   - You can see and change exactly how the ghost is prompted and constrained.
   - Honest trade-offs: where Gemma struggled (large components, complex JSX) and how the size gate and retry handle it.
7. **The Spirit of It (optional):** the Día de los Muertos preset and designing it with respect.
8. **Prize Categories:** DigitalOcean, Gemma (+ TabPFN only if the Scare-o-meter ships).
9. **Closing:** "Bring me one component at a time."

## 10.4 Writing checklist

- [ ] Hook in the first 3 lines; hero GIF above the fold
- [ ] Every section has an image, GIF or code block
- [ ] At least 3 real numbers from the eval and the live site
- [ ] Honest limits section
- [ ] Live link works in an incognito window; repo public; links checked
- [ ] Published by **Sun Nov 1, 10:00 AM PKT** (deadline 11:59 AM)
