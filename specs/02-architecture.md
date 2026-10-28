# 02 · Architecture

## Shape

One Next.js app on **DigitalOcean App Platform**. The browser never talks to the model directly; it calls the app's API, which gates, prompts, streams and validates. Previews render in a sandboxed iframe in the browser.

```
Browser                                   Next.js on DigitalOcean App Platform            Model
───────                                   ────────────────────────────────────            ─────
Editor ── paste ──▶ lib/limits (client copy, instant size meter + refusal)
Possess ── POST /api/possess (SSE) ──▶  lib/limits (server, authoritative)
                                        lib/ghost/prompt.ts  (preset + intensity + history)
                                        lib/model/provider.ts ── stream ───────────────▶ Gemma 4
                                        lib/ghost/parse.ts   (whisper / code / changes)       (Gemini API, or
                                        lib/ghost/validate.ts (transform check, retry once)   DO GPU Droplet)
        ◀── SSE: whisper deltas, code, changes, effects, done
Preview ── srcdoc ──▶ sandboxed iframe: React 18 UMD + Sucrase + Tailwind browser + effects.css
        ◀── postMessage: render ok / runtime error / contrast report
Chat   ── POST /api/possess {mode:"refine"|"ask", history, latest}
```

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| App + API | Next.js 16 App Router, TypeScript strict | Huzaifa's main stack |
| Hosting | DigitalOcean App Platform (region BLR1) | DigitalOcean category; simple Git deploys |
| Domain | Default `*.ondigitalocean.app` URL (the .tech Domain category is not entered) | Avoids giving card details for a domain |
| Styling | Tailwind v4 | Speed |
| Editor | CodeMirror 6 (`@uiw/react-codemirror`, JS + HTML + CSS langs) | Good DX, small |
| Validation | Zod | API and model output |
| Model | Gemma 4 via Gemini API (`gemma-4-31b-it`, fallback `gemma-4-26b-a4b-it`) | Open weights, free tier, known quirks |
| Alt model | OpenAI-compatible provider → Gemma on a DO GPU Droplet (vLLM/Ollama) | Self-hosting story, optional |
| Preview runtime | React 18 UMD (committed in `public/vendor/`) + `@tailwindcss/browser` (copied at postinstall); JSX transformed by Sucrase in the parent app | No CDN, works in sandbox |
| Diff | `diff` (jsdiff) | Diff tab |
| Tests | Vitest | |

## Folder structure

```
possessed/
├── CLAUDE.md
├── README.md
├── LICENSE                       Apache 2.0
├── .env.example                  GEMINI_API_KEY, MODEL_PROVIDER, OPENAI_COMPAT_BASE_URL, RATE_LIMIT_PER_HOUR
├── specs/  tasks/  decisions/  docs/assets/
├── scripts/
│   ├── copy-vendor.ts            copies the Tailwind browser build, effects.css and fonts into public/ (postinstall)
│   └── eval-ghost.ts             runs every fixture through the ghost, saves outputs to tests/eval-out/
├── public/vendor/                (generated) preview runtime files
├── src/
│   ├── app/
│   │   ├── page.tsx              the haunted studio (single page)
│   │   ├── layout.tsx  globals.css
│   │   └── api/
│   │       ├── possess/route.ts  POST → SSE (possess | refine | ask)
│   │       └── health/route.ts   GET model status
│   ├── components/
│   │   ├── editor/CodeEditor.tsx       CodeMirror, language badge, size meter, samples
│   │   ├── editor/PresetPicker.tsx     presets + intensity + "possess the words" toggle
│   │   ├── preview/PreviewFrame.tsx    sandboxed iframe, postMessage bridge
│   │   ├── preview/BeforeAfter.tsx     slider + side-by-side
│   │   ├── preview/OutputTabs.tsx      Code / Effects CSS / Changes / Diff, copy + download
│   │   ├── chat/GhostChat.tsx          Vesper chat, version history
│   │   └── chat/GhostAvatar.tsx        animated ghost (idle, thinking, speaking, refusing)
│   ├── effects/
│   │   ├── effects.css           all ghost-* effect classes (spec 04)
│   │   ├── catalog.ts            effect names, descriptions, which presets use them
│   │   └── presets/*.ts          palettes, fonts, default effects per preset
│   ├── lib/
│   │   ├── limits/gate.ts        size gate + page/non-UI detection + refusal messages (shared client/server)
│   │   ├── limits/detect.ts      language detection (html vs jsx/tsx)
│   │   ├── limits/ratelimit.ts   per-IP token bucket (in memory)
│   │   ├── ghost/prompt.ts       system + user prompt builders
│   │   ├── ghost/parse.ts        streaming parser for <whisper>/<code>/<changes>
│   │   ├── ghost/validate.ts     sucrase transform check / HTML parse check, effect names check
│   │   ├── ghost/possess.ts      orchestration: gate → prompt → stream → validate → retry
│   │   ├── model/provider.ts     interface + factory
│   │   ├── model/gemini-gemma.ts Gemini API streaming, retries, model switch
│   │   ├── model/openai-compat.ts Gemma on a DO GPU Droplet (vLLM / Ollama)
│   │   ├── preview/srcdoc.ts     builds the iframe document (CSP, runtime, effects, user code)
│   │   └── a11y/contrast.ts      WCAG contrast math (used inside the iframe script)
│   └── types/index.ts            Zod schemas: PossessRequest, GhostEvent, Preset, Version
└── tests/
    ├── fixtures/components/      sample inputs: good, too big, whole page, non-UI, tricky JSX
    ├── gate.test.ts  detect.test.ts  parse.test.ts  validate.test.ts  srcdoc.test.ts  contrast.test.ts
```

## Key types (`src/types/index.ts`)

```ts
Language       = "html" | "jsx" | "tsx"
PresetId       = "victorian" | "muertos" | "terminal" | "gothic" | "jinn"
Intensity      = "whisper" | "haunt" | "possession"
PossessRequest = { mode: "possess" | "refine" | "ask"; code: string; language: Language;
                   preset: PresetId; intensity: Intensity; possessWords: boolean;
                   message?: string; history?: { role: "user" | "ghost"; text: string }[] }
GhostEvent     = { type: "whisper"; delta: string }
               | { type: "code"; code: string; language: Language }
               | { type: "changes"; items: string[] }
               | { type: "effects"; names: string[] }
               | { type: "refusal"; reason: RefusalReason; message: string }
               | { type: "error"; message: string; retryable: boolean }
               | { type: "done"; ms: number; model: string }
```

## Configuration (`.env` on App Platform)

| Variable | Default | Meaning |
|---|---|---|
| `GEMINI_API_KEY` | (required for default provider) | Server-side only |
| `MODEL_PROVIDER` | `gemini-gemma` | or `openai-compat` |
| `GEMMA_MODELS` | `gemma-4-31b-it,gemma-4-26b-a4b-it` | Primary first, fallback second |
| `OPENAI_COMPAT_BASE_URL` / `OPENAI_COMPAT_MODEL` | (none) | Gemma on a DO GPU Droplet |
| `RATE_LIMIT_PER_HOUR` | `20` | Possessions per IP |
| `MAX_LINES` / `MAX_CHARS` | `200` / `8000` | Size gate |
