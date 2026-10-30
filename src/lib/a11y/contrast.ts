// WCAG 2.x relative luminance + contrast ratio helpers (also bundled into the frame script).
// Spec: specs/05-preview-sandbox.md §5.5
// Task: T3.2

export type Rgba = [number, number, number, number];

export interface ContrastFailure {
  text: string;
  ratio: number;
  required: 3 | 4.5;
}

export interface ContrastReport {
  failures: ContrastFailure[];
  /** Texts skipped because a gradient, image or transparent backdrop made the background unknowable. */
  unmeasured: number;
}

/**
 * Self-contained on purpose: the frame script is `(${createContrastKit})()`, so this function must not
 * reference anything outside its own body. Tests call it directly; the sandbox runs its source text.
 */
export function createContrastKit() {
  function channel(c: number): number {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }

  function luminance(c: Rgba): number {
    return 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
  }

  function ratio(a: Rgba, b: Rgba): number {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  /** 3:1 for large text (24px, or 18.66px and bold), 4.5:1 otherwise. */
  function required(px: number, weight: number): 3 | 4.5 {
    return px >= 24 || (px >= 18.66 && weight >= 700) ? 3 : 4.5;
  }

  /** `top` painted over an opaque `bottom`. */
  function over(top: Rgba, bottom: Rgba): Rgba {
    const a = top[3];
    return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
  }

  /** rgb()/rgba() directly; anything else (oklch from Tailwind v4, color-mix, …) through a 1px canvas. */
  function parse(css: string, doc?: Document): Rgba | null {
    const m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/.exec(css.trim());
    if (m) {
      const a = m[4] === undefined ? 1 : m[5] ? Number(m[4]) / 100 : Number(m[4]);
      return [Number(m[1]), Number(m[2]), Number(m[3]), a];
    }
    if (!doc) return null;
    try {
      const ctx = doc.createElement("canvas").getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    } catch {
      return null;
    }
  }

  /** The colour behind `el`'s text, or null when it cannot be known. */
  function backdrop(el: Element, doc: Document, win: Window): Rgba | null {
    const layers: Rgba[] = [];
    for (let node: Element | null = el; node; node = node.parentElement) {
      const cs = win.getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const bg = parse(cs.backgroundColor, doc);
      if (!bg) return null;
      if (bg[3] > 0) layers.push(bg);
      if (bg[3] >= 1) break;
    }
    const base = layers[layers.length - 1];
    if (!base || base[3] < 1) return null; // transparent all the way up: the studio decides what is behind it
    let out: Rgba = base;
    for (let i = layers.length - 2; i >= 0; i--) out = over(layers[i], out);
    return out;
  }

  function measure(doc: Document, win: Window): ContrastReport {
    const failures: ContrastFailure[] = [];
    const seen: Record<string, true> = {};
    let unmeasured = 0;
    const walker = doc.createTreeWalker(doc.body, 4 /* NodeFilter.SHOW_TEXT */);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const raw = node.nodeValue || "";
      const text = raw.replace(/\s+/g, " ").trim();
      const el = node.parentElement;
      if (!text || !el || el.closest("script,style,noscript")) continue;
      const cs = win.getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;

      let opacity = 1;
      for (let n: Element | null = el; n; n = n.parentElement) opacity *= Number(win.getComputedStyle(n).opacity);
      if (opacity === 0) continue;

      const fg = parse(cs.color, doc);
      const bg = backdrop(el, doc, win);
      if (!fg || !bg) {
        unmeasured++;
        continue;
      }
      const solid = over([fg[0], fg[1], fg[2], fg[3] * opacity], bg);
      const px = parseFloat(cs.fontSize) || 16;
      const need = required(px, parseInt(cs.fontWeight, 10) || 400);
      const got = ratio(solid, bg);
      if (got >= need) continue;
      const key = text + "|" + got.toFixed(2);
      if (seen[key]) continue;
      seen[key] = true;
      failures.push({ text: text.slice(0, 60), ratio: Math.round(got * 100) / 100, required: need });
      if (failures.length >= 20) break;
    }
    return { failures, unmeasured };
  }

  return { luminance, ratio, required, over, parse, measure };
}

/** The script that runs inside the sandbox: exposes `window.__ghostMeasure()`, which posts the report. */
export function contrastFrameScript(): string {
  // Some compilers wrap named functions in a `__name` helper; the frame has no such helper, so supply a no-op.
  return `(function () {
  var __name = function (f) { return f; };
  var kit = (${createContrastKit.toString()})();
  window.__ghostMeasure = function () {
    try {
      var r = kit.measure(document, window);
      parent.postMessage({ type: "contrast", failures: r.failures, unmeasured: r.unmeasured }, "*");
    } catch (e) {}
  };
})();`;
}

/** The refinement the "Fix contrast" button sends to Vesper. */
export function fixContrastMessage(failures: ContrastFailure[]): string {
  const list = failures
    .slice(0, 4)
    .map((f) => `"${f.text.slice(0, 40)}" (${f.ratio}:1, needs ${f.required}:1)`)
    .join("; ");
  return `Fix the contrast: these texts are too hard to read, so make them meet WCAG AA while keeping the theme: ${list}.`;
}
