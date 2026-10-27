# 09 · Testing

## 9.1 Unit tests (Vitest)

| File | Covers | Key cases |
|---|---|---|
| `gate.test.ts` | size gate | empty, exactly at limit, 1 over, whole page (`<html>`, 4 components), non-UI (pure TS util), `fetch(` inside component, `<script src>` |
| `detect.test.ts` | language detection | HTML fragment, JSX with Tailwind, TSX with props interface, ambiguous → unknown |
| `parse.test.ts` | streaming parser | tags split across chunks, fenced code inside `<code>`, missing `</effects>`, `ask` with whisper only, preamble before `<whisper>` |
| `validate.test.ts` | validation | broken JSX caught, renamed component caught, unknown `ghost-` class stripped, text-preservation threshold |
| `srcdoc.test.ts` | preview document | CSP present, no `allow-same-origin` anywhere, imports stubbed, HTML `<script src>` removed |
| `contrast.test.ts` | WCAG math | black/white = 21, known pairs, large-text threshold |
| `ratelimit.test.ts` | rate limiter | bucket refills, `ask` costs half |

## 9.2 Fixture components (`tests/fixtures/components/`)

`pricing-card.jsx`, `login-form.html`, `navbar.tsx`, `guideme-sidepanel.html` (from GuideMe: real-world demo), `profile-card.jsx` (inline styles), plus negative cases: `full-page.html`, `huge-dashboard.jsx` (250+ lines), `api-util.ts`, `script-src.html`.

## 9.3 Ghost eval (`npm run eval`)

Runs each positive fixture × 5 presets × intensity "haunt" through the real model and writes `tests/eval-out/{fixture}-{preset}.{ext}` + a summary table to `tasks/notes.md`: validation pass, retries, latency, contrast failures. Target before recording the demo: **≥ 90% pass without retry**, no contrast failures on body text.

## 9.4 Manual checklist (deployed site)

- [ ] Each sample possesses in every preset; preview renders; copy and download work
- [ ] Oversized input refused instantly with no network call to `/api/possess` (check DevTools)
- [ ] Whole page and non-UI inputs refused with the right message
- [ ] Malicious input (`<img src=x onerror=alert(1)>`, `fetch('https://…')`, `while(true){}`) cannot reach the parent, the network, or freeze the app (watchdog)
- [ ] Refine: "less scary" changes intensity; "keep my blue" keeps brand colour; question gets an answer without code
- [ ] Version history steps back and forward
- [ ] Rate limit message appears after the limit
- [ ] Reduced motion: effects static
- [ ] Mobile layout usable
- [ ] Footer shows model and DigitalOcean; domain on HTTPS
