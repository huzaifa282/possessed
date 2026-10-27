# Possessed

> Paste one UI component. A ghost designer possesses it.

Possessed returns spooky-themed code for your component and shows a live before/after preview. Chat with Vesper, the ghost designer, to refine it. Hand it a whole page and it refuses: *"This is beyond my ghostly powers."* Powered by Gemma (open weights), hosted on DigitalOcean.

**Status:** in development for the DEV Hacktoberfest Week 4 challenge, "Ghost in the Machine" (Oct 26–31, 2026).

## How this repo is organised (spec-driven)

| Folder | What's in it |
|---|---|
| `specs/` | Source of truth: overview, requirements, architecture, size gate, effects and presets, preview sandbox, ghost engine, model, deployment, testing, demo and post, TabPFN stretch |
| `tasks/` | Day-by-day checklists with acceptance criteria, plus a backlog |
| `decisions/` | Architecture decision records |
| `src/` | Next.js app; each stub names the spec and task it implements |
| `.claude/commands/` | `/next-task`, `/spec-check`, `/eval-ghost`, `/possess-check` |

## Development

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY
npm run dev
npm test
```

## License

Apache 2.0. React 18 UMD files in `public/vendor/` are MIT-licensed (see `public/vendor/REACT-LICENSE.txt`).
