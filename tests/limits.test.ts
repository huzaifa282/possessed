import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detect } from "@/lib/limits/detect";
import { gate, REFUSAL_MESSAGES, type GateReason } from "@/lib/limits/gate";

const dir = path.resolve(__dirname, "fixtures/components");
const fixture = (name: string) => readFileSync(path.join(dir, name), "utf8");

describe("detect", () => {
  it("detects an HTML fragment", () => expect(detect(fixture("login-form.html"))).toBe("html"));
  it("detects HTML after a leading comment", () => expect(detect(fixture("guideme-sidepanel.html"))).toBe("html"));
  it("detects JSX with Tailwind", () => expect(detect(fixture("pricing-card.jsx"))).toBe("jsx"));
  it("detects JSX with inline styles", () => expect(detect(fixture("profile-card.jsx"))).toBe("jsx"));
  it("detects TSX with a props interface", () => expect(detect(fixture("navbar.tsx"))).toBe("tsx"));
  it("returns unknown for non-markup code", () => expect(detect(fixture("api-util.ts"))).toBe("unknown"));
  it("returns unknown for ambiguous text", () => expect(detect("just some words here, nothing else")).toBe("unknown"));
});

describe("gate on fixtures", () => {
  const positives = ["pricing-card.jsx", "login-form.html", "navbar.tsx", "guideme-sidepanel.html", "profile-card.jsx"];

  it.each(positives)("lets %s through", (file) => {
    const code = fixture(file);
    expect(gate(code, detect(code)).ok).toBe(true);
  });

  const negatives: [string, GateReason][] = [
    ["full-page.html", "whole_page"],
    ["huge-dashboard.jsx", "too_big"],
    ["api-util.ts", "not_ui"],
    ["script-src.html", "unsafe"],
  ];
  it.each(negatives)("refuses %s as %s", (file, reason) => {
    const code = fixture(file);
    const r = gate(code, detect(code));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe(reason);
      expect(REFUSAL_MESSAGES[reason]).toContain(r.message);
    }
  });
});

describe("gate edge cases", () => {
  const ok = '<div class="card"><p>Hello there</p></div>';
  const reason = (code: string) => {
    const r = gate(code, detect(code));
    return r.ok ? "ok" : r.reason;
  };

  it("refuses empty and tiny input", () => {
    expect(reason("")).toBe("empty");
    expect(reason("   \n  ")).toBe("empty");
    expect(reason("<p>hi</p>")).toBe("empty");
  });

  it("enforces the line limit exactly", () => {
    const body = (n: number) => `<div>\n${Array(n - 2).fill("<p>line</p>").join("\n")}\n</div>`;
    expect(reason(body(200))).toBe("ok");
    expect(reason(body(201))).toBe("too_big");
  });

  it("enforces the char limit exactly", () => {
    const pad = (n: number) => `<div>${"x".repeat(n - 11)}</div>`;
    expect(pad(8000).length).toBe(8000);
    expect(reason(pad(8000))).toBe("ok");
    expect(reason(pad(8001))).toBe("too_big");
  });

  it("does not mistake <header> for <head>", () => {
    expect(reason('<header class="p-4"><h1>Title text</h1></header>')).toBe("ok");
  });

  it("refuses more than 3 components", () => {
    const code = ["A", "B", "C", "D"]
      .map((n) => `function ${n}() { return <div className="x">${n}</div>; }`)
      .join("\n");
    expect(reason(code)).toBe("whole_page");
  });

  it("refuses more than 3 top-level sections", () => {
    const code = "<header>a</header><main>b</main><section>c</section><footer>d</footer>";
    expect(reason(code)).toBe("whole_page");
  });

  it("refuses data and routing code", () => {
    const wrap = (s: string) => `export default function X() {\n  ${s}\n  return <div className="a">hi</div>;\n}`;
    for (const s of ["fetch('/api')", "const q = useQuery(k)", "import axios from 'axios'", "<Route path='/'/>", "SELECT id FROM users"]) {
      expect(reason(wrap(s)), s).toBe("not_ui");
    }
  });

  it("does not flag ordinary prose that resembles SQL", () => {
    expect(reason('<p class="x">Select a plan from the list below to continue.</p>')).toBe("ok");
  });

  it("refuses code with no markup, including generics", () => {
    expect(reason("export function f(a: Array<string>): number { return a.length; }")).toBe("not_ui");
  });

  it("refuses <script src> and <iframe>", () => {
    expect(reason(`${ok}<script src="x.js"></script>`)).toBe("unsafe");
    expect(reason(`${ok}<iframe src="x"></iframe>`)).toBe("unsafe");
  });

  it("reports stats", () => {
    const r = gate(ok, "html");
    expect(r.stats).toMatchObject({ lines: 1, chars: ok.length, language: "html" });
  });
});
