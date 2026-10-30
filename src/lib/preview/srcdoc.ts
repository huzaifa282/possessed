// Builds the sandboxed preview document: CSP, vendor runtime, effects.css, fonts, user code (HTML or transformed JSX), postMessage bridge, contrast script.
// Spec: specs/05-preview-sandbox.md
// Task: T1.10
import { contrastFrameScript } from "@/lib/a11y/contrast";
import type { Language } from "@/types";
import { transformJsx } from "./transform";

/** The only sandbox flag the frame ever gets. Never add allow-same-origin (spec 05 §5.1). */
export const SANDBOX = "allow-scripts";

export const IMPORT_NOTICE = "Some spirits (imports) couldn't cross over to the preview.";

export interface SrcdocInput {
  code: string;
  language: Language;
  /** Origin that serves /vendor and /fonts, e.g. window.location.origin. */
  appOrigin: string;
}

export interface SrcdocResult {
  html: string;
  notices: string[];
}

export function contentSecurityPolicy(origin: string): string {
  return [
    "default-src 'none'",
    `script-src 'unsafe-inline' ${origin}/vendor/`,
    `style-src 'unsafe-inline' ${origin}/vendor/ ${origin}/fonts/`,
    `font-src ${origin}/fonts/`,
    "img-src data: blob:",
    "connect-src 'none'",
    "frame-src 'none'",
    "form-action 'none'",
  ].join("; ");
}

/** Keep user text from closing our <script> element or opening an HTML comment inside it. */
export function escapeForScript(js: string): string {
  return js.replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");
}

/** Defence in depth: the CSP already blocks these. */
export function stripExternalEmbeds(html: string): string {
  return html
    .replace(/<iframe\b[\s\S]*?(?:<\/iframe\s*>|$)/gi, "")
    .replace(/<script\b[^>]*\bsrc\s*=[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script\b[^>]*\bsrc\s*=[^>]*>/gi, "");
}

const FRAME_RUNTIME = `
(function () {
  function post(m) { try { parent.postMessage(m, "*"); } catch (e) {} }
  window.addEventListener("error", function (e) { post({ type: "error", message: String(e.message || "Unknown error") }); });
  window.addEventListener("unhandledrejection", function (e) { post({ type: "error", message: String(e.reason) }); });

  window.__stub = function (name) {
    if (!/^[A-Z]/.test(name)) {
      return function () {
        var out = [];
        for (var i = 0; i < arguments.length; i++) if (typeof arguments[i] === "string") out.push(arguments[i]);
        return out.join(" ");
      };
    }
    var C = function () {
      return React.createElement("span", {
        title: name + " (import not available in the preview)",
        style: { display: "inline-block", border: "1px dashed #888", padding: "0 4px", font: "12px monospace", color: "#888" }
      }, name);
    };
    C.displayName = name;
    return C;
  };

  function height() { return Math.ceil(document.documentElement.scrollHeight); }
  window.__ghostReady = function () {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        post({ type: "ready", height: height() });
        // Fonts and effects settle shortly after first paint; measure once they have.
        setTimeout(function () { if (window.__ghostMeasure) window.__ghostMeasure(); }, 700);
        if (window.ResizeObserver) new ResizeObserver(function () { post({ type: "resize", height: height() }); }).observe(document.body);
      });
    });
  };

  window.__ghostMount = function () {
    var m = window.__module || {};
    var C = m["default"];
    if (!C) {
      var keys = Object.keys(m).filter(function (k) { return k !== "__fallback" && typeof m[k] === "function"; });
      if (keys.length) C = m[keys[keys.length - 1]];
    }
    if (!C) C = m.__fallback;
    if (typeof C !== "function") { post({ type: "error", message: "No component found to render" }); window.__ghostReady(); return; }

    class Boundary extends React.Component {
      constructor(p) { super(p); this.state = { error: null }; }
      static getDerivedStateFromError(error) { return { error: error }; }
      componentDidCatch(error) { post({ type: "error", message: String(error && error.message || error) }); }
      render() {
        if (this.state.error) {
          return React.createElement("pre", { style: { color: "#b00020", font: "12px monospace", whiteSpace: "pre-wrap" } },
            "The spirit stumbled: " + String(this.state.error.message || this.state.error));
        }
        return this.props.children;
      }
    }
    ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Boundary, null, React.createElement(C)));
    window.__ghostReady();
  };
})();
`;

export function buildSrcdoc({ code, language, appOrigin }: SrcdocInput): SrcdocResult {
  const origin = new URL(appOrigin).origin;
  const notices: string[] = [];
  let body: string;

  if (language === "html") {
    body = `<div id="root">${stripExternalEmbeds(code)}</div>\n<script>window.__ghostReady();</script>`;
  } else {
    const { js, stubbed, fallbackName } = transformJsx(code);
    if (stubbed.length) notices.push(IMPORT_NOTICE);
    const fallback = fallbackName ? `exports.__fallback = ${fallbackName};` : "";
    const wrapped = `(function (exports) {\n${js}\n;${fallback}\n})(window.__module = {});`;
    body = [
      `<div id="root"></div>`,
      `<script src="${origin}/vendor/react.production.min.js"></script>`,
      `<script src="${origin}/vendor/react-dom.production.min.js"></script>`,
      `<script>${escapeForScript(FRAME_RUNTIME)}</script>`,
      `<script>${escapeForScript(contrastFrameScript())}</script>`,
      `<script>${escapeForScript(wrapped)}</script>`,
      `<script>window.__ghostMount();</script>`,
    ].join("\n");
  }

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(origin)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${origin}/vendor/fonts.css">
<link rel="stylesheet" href="${origin}/vendor/effects.css">
<script src="${origin}/vendor/tailwind.browser.js"></script>
<style>html,body{margin:0}body{padding:16px;font-family:system-ui,sans-serif}</style>
</head>
<body>
${language === "html" ? `<script>${escapeForScript(FRAME_RUNTIME)}</script>\n` : ""}${body}
</body>
</html>`;
  return { html, notices };
}
