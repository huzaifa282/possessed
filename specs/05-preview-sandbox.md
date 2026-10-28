# 05 · Preview sandbox

Renders **untrusted** code (pasted and generated) safely, in the browser. `src/lib/preview/srcdoc.ts` builds the document; `PreviewFrame.tsx` hosts it.

## 5.1 Isolation rules (non-negotiable)

- `<iframe sandbox="allow-scripts" srcdoc="...">`: **never** `allow-same-origin`, `allow-forms`, `allow-popups`, `allow-top-navigation`. The frame has an opaque origin: no cookies, no localStorage of the app, no access to the parent DOM.
- CSP meta inside the document:
  `default-src 'none'; script-src 'unsafe-inline' {appOrigin}/vendor/; style-src 'unsafe-inline' {appOrigin}/vendor/ {appOrigin}/fonts/; font-src {appOrigin}/fonts/; img-src data: blob:; connect-src 'none'; frame-src 'none'; form-action 'none'`
  (No `unsafe-eval`: the JSX transform runs in the parent app, see 5.3. Tailwind's browser build may need `unsafe-eval`; if so, add it, since the sandbox and `connect-src 'none'` still contain the code. Record the outcome in this spec.)
  **Outcome (T1.10, Chrome):** the Tailwind v4 browser build works under this CSP without `unsafe-eval`, so the CSP stays as written.
- Communication only via `postMessage`; the parent checks `event.source === iframe.contentWindow` and validates messages with Zod.
- A render watchdog: if the frame doesn't report `ready` within 5 s (infinite loop), the parent replaces it and shows "The spirit froze. Try again."

## 5.2 Runtime inside the frame (self-hosted in `public/vendor/`)

| File | Source | Purpose |
|---|---|---|
| `react.production.min.js`, `react-dom.production.min.js` | React 18.3 UMD builds, **committed** in `public/vendor/` (React 19 no longer ships UMD) | Render JSX components |
| `tailwind.browser.js` | `@tailwindcss/browser` (v4) `dist/index.global.js`, copied by `copy-vendor` | Generate Tailwind CSS from classes at runtime |
| `effects.css` | `src/effects/effects.css` | All ghost-* effects |
| `/fonts/*` | `@fontsource/*` | Preset fonts |

`scripts/copy-vendor.ts` copies these at `postinstall` so they deploy with the app.

**CORS note:** the sandboxed frame has an opaque (`null`) origin, so cross-origin **font** loads need `Access-Control-Allow-Origin: *` on `/fonts/*` (set in `next.config.ts` headers). Scripts and stylesheets load without CORS.

## 5.3 Rendering

- **HTML:** inject the fragment into `<div id="root">`; `<style>` blocks kept; inline `on*=` handlers allowed (sandboxed).
- **JSX/TSX:**
  1. Replace non-react imports with stubs (spec 03 §3.3).
  2. **In the parent app** (client bundle), Sucrase transforms the code (`transforms: ["jsx","typescript","imports"]`, `jsxRuntime: "classic"` so it uses the global `React`). The resulting JS is embedded as an inline `<script>` that assigns exports to `window.__module`. The frame never evaluates strings itself.
  3. Pick the component: default export, else the last exported function, else the last capitalised function.
  4. Render inside an error boundary: `ReactDOM.createRoot(root).render(<Boundary><Component/></Boundary>)` with empty props (a component that needs props such as arrays will show the error boundary; see backlog). Runtime errors post `{type:"error", message}`.
- The frame posts `{ type: "ready", height }` after the first paint; the parent resizes the frame (min 240 px, max 900 px, then scroll).

## 5.4 Before/after

- Two frames (original, possessed) share the same width so the comparison is fair.
- **Slider mode:** frames stacked, the "after" frame clipped with `clip-path: inset(0 0 0 X%)` controlled by a draggable handle.
- **Side-by-side mode:** two columns; on narrow screens, tabs.
- Background toggle: light / dark / checkerboard (so transparent components are visible).

## 5.5 Contrast report (P1)

After `ready`, a script inside the frame walks visible text nodes, computes foreground vs effective background colour (walking up for the first non-transparent background), font size and weight, and posts `{ type: "contrast", failures: [{ text, ratio, required }] }`. Math lives in `src/lib/a11y/contrast.ts` (WCAG 2.x relative luminance) and is bundled into the frame script. Gradients and images behind text are skipped (reported as "couldn't measure").
