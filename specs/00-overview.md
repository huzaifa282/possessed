# 00 · Overview

## One-liner

**Paste a UI component. A ghost designer possesses it.** You get spooky-themed code for the same component and a live before/after preview, powered by Gemma, an open-weight model.

## The story (for the post)

Every October, brands and agencies ship Halloween versions of their sites: a spooky pricing card, a haunted login form, a Día de los Muertos banner. It's fiddly work that steals a week from real projects. I run a small web studio, so I hired a ghost to do it.

The ghost is a real designer: it keeps your component's structure and props, re-themes it with a curated library of effects (fog, candlelight, cobwebs, marigolds, CRT scanlines), checks the text is still readable, and talks you through what it changed. Hand it a whole page and it refuses: *"This is beyond my ghostly powers. Bring me one component at a time."*

## Challenge fit

DEV Hacktoberfest **Week 4: Ghost in the Machine** (Oct 26–31, 2026).

| Theme ask | How Possessed answers it |
|---|---|
| Spooky | Components get possessed; a ghost designer with a voice; haunted presets |
| Honors the past (Día de los Muertos) | A dedicated Día de los Muertos preset (marigolds, papel picado, calaveras) designed with care, not as a costume |
| Open-source AI at the core | Gemma (open weights) does all the design work; nothing works without it |
| Why open matters | Paste private client code without sending it to a closed AI; swap or self-host the model (DigitalOcean GPU Droplet option); free to iterate |

## Judging criteria and how we win them

1. **Writing Quality (weighted most):** agency story, before/after GIFs of real components (GuideMe's side panel, a login form, a pricing card), honest about limits. See `10-demo-and-post.md`.
2. **Relevance:** literally a ghost in the machine doing the design work.
3. **Creativity:** no other Week 4 entry is a design tool (checked Oct 28: 35 entries, mostly haunted terminals, git séances, ofrendas).
4. **Technical Execution:** safe sandboxed preview of untrusted code, size gate, structured output with validation and retry, contrast check, effects library.
5. **Partner technology:** DigitalOcean (hosting), Gemma (model).

## Prize categories we enter

| Category | How we qualify | Prize |
|---|---|---|
| Overall | | $250 + DEV++ |
| **DigitalOcean** (featured) | App hosted on DigitalOcean App Platform; optional Gemma on a GPU Droplet | $200 |
| **Gemma** (featured) | Gemma 4 does the possession | $200 |
| TabPFN (featured, stretch) | Scare-o-meter ranks variants (spec 11) | $200 |

## Non-goals

- No rebuilding sites from a URL. No screenshots (P2 at most).
- No whole pages. One component at a time, enforced.
- No accounts, no database of user code. Nothing is stored after the response.

## Success = by the deadline

- Live on DigitalOcean, usable by judges
- Public GitHub repo (new, created this week), Apache 2.0
- Before/after GIFs + 60–90 s video
- Published DEV post with the challenge template, tags `#devchallenge #hf26challenge`
