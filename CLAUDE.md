# Possessed: instructions for Claude Code

Possessed is a website where you paste the frontend code of **one UI component** and a ghost designer ("Vesper") **possesses** it: it returns spooky-themed code for the same component and shows the result in a **live before/after preview**. You can chat with the ghost to refine it ("less scary", "more Día de los Muertos", "keep my brand colours"). Components that are too big get turned away in character ("This is beyond my ghostly powers…").

Built for the DEV **Hacktoberfest Week 4 challenge "Ghost in the Machine"**. Deadline: **Sat Oct 31, 11:59 PM PDT = Sun Nov 1, 11:59 AM PKT**. Target categories: **DigitalOcean**, **Gemma**, **.tech Domain**; **TabPFN** only as a stretch goal (spec 11).

## How we work (spec-driven)

1. **Specs are the source of truth.** Read the relevant file in `specs/` before writing code. If code and spec disagree, fix the spec first (and say so), then the code.
2. **Work from `tasks/`.** Do the first unchecked task in the current day file, meet its acceptance criteria, tick it `[x]`, add notes under "Notes".
3. **Decisions go in `decisions/`** as short ADRs. Don't silently change the stack.
4. **Small, verifiable steps.** Every task ends with something runnable or a passing test.
5. **No scope creep.** Anything not in `specs/01-requirements.md` goes to `tasks/backlog.md`.

## Read order

`specs/00-overview.md` → `01-requirements.md` → `02-architecture.md` → the spec for the area you're touching.

## Stack

- Next.js 16 (App Router) + TypeScript strict + Tailwind CSS v4, deployed on **DigitalOcean App Platform**
- Zod at every boundary (API input, model output)
- Model: **Gemma 4** (open weights) via the Gemini API by default, behind a `ModelProvider` interface; an OpenAI-compatible provider lets us point at Gemma on a DigitalOcean GPU Droplet instead
- Preview: sandboxed `<iframe srcdoc>` with React 18 UMD and the Tailwind v4 browser build, **self-hosted** in `public/vendor/`; JSX is transformed by Sucrase in the parent app
- Tests: Vitest

## Hard rules

- **Never trust pasted or generated code.** It only ever runs inside the preview iframe with `sandbox="allow-scripts"` (never `allow-same-origin`), a strict CSP, and no network access. The app never `eval`s user code in its own origin.
- **Size gate first.** Every request passes `src/lib/limits` before any model call. Oversized or non-UI input gets an in-character refusal and costs zero tokens.
- **The API key stays on the server.** Never expose `GEMINI_API_KEY` to the client. Rate-limit per IP.
- **Preserve the component.** Same name, props, structure and text meaning. Only styling changes, unless the user turns on "possess the words too".
- **Effects come from the library.** The ghost applies effects by class name from `src/effects/`; it does not invent large CSS blobs. This keeps output polished and small.
- **Accessibility matters.** Effects respect `prefers-reduced-motion`; text contrast is checked after every possession (spec 06).
- Lessons from GuideMe for Gemma via the Gemini API: **no `responseMimeType`** (causes HTTP 500), retry 5xx/429 with backoff, switch between `gemma-4-31b-it` and `gemma-4-26b-a4b-it` on repeated failure.

## Commands

- `npm run dev` · `npm test` · `npm run typecheck` · `npm run lint`
- `npm run eval`: run the ghost on every fixture in `tests/fixtures/components/` and save outputs for review (spec 09)

## Definition of done (any task)

Meets acceptance criteria · types and tests pass · spec updated if behaviour changed · task ticked.
