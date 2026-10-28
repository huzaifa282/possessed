import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FrameMessage } from "@/lib/preview/messages";
import { buildSrcdoc, contentSecurityPolicy, escapeForScript, IMPORT_NOTICE, SANDBOX, stripExternalEmbeds } from "@/lib/preview/srcdoc";
import { stubImports, transformJsx } from "@/lib/preview/transform";

const ORIGIN = "http://localhost:3000";
const fixture = (name: string) => readFileSync(path.resolve(__dirname, "fixtures/components", name), "utf8");
const build = (code: string, language: "html" | "jsx" | "tsx") => buildSrcdoc({ code, language, appOrigin: ORIGIN });

describe("sandbox isolation", () => {
  it("only ever grants allow-scripts", () => {
    expect(SANDBOX).toBe("allow-scripts");
  });

  it("never mentions allow-same-origin in any generated document", () => {
    for (const [file, lang] of [["login-form.html", "html"], ["pricing-card.jsx", "jsx"], ["navbar.tsx", "tsx"]] as const) {
      expect(build(fixture(file), lang).html).not.toMatch(/allow-same-origin/i);
    }
  });

  it("embeds the strict CSP", () => {
    const { html } = build("<p>hello world, this is long enough</p>", "html");
    expect(html).toContain('http-equiv="Content-Security-Policy"');
    const csp = contentSecurityPolicy(ORIGIN);
    expect(html).toContain(csp);
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("form-action 'none'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain(`script-src 'unsafe-inline' ${ORIGIN}/vendor/`);
  });

  it("normalises the app origin so it cannot inject CSP directives", () => {
    const { html } = buildSrcdoc({ code: "<p>hi there friend!</p>", language: "html", appOrigin: "http://a.test:3000/x; script-src *" });
    expect(html).toContain("http://a.test:3000/vendor/");
    expect(html).not.toContain("script-src *");
  });

  it("rejects an invalid app origin", () => {
    expect(() => buildSrcdoc({ code: "<p>x</p>", language: "html", appOrigin: "not a url" })).toThrow();
  });

  it("loads only self-hosted vendor files", () => {
    const { html } = build(fixture("pricing-card.jsx"), "jsx");
    const srcs = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]);
    expect(srcs.length).toBeGreaterThan(0);
    for (const s of srcs) expect(s.startsWith(`${ORIGIN}/vendor/`), s).toBe(true);
  });
});

describe("HTML documents", () => {
  it("removes <script src> and <iframe> from user HTML", () => {
    const { html } = build('<p>kept</p><script src="https://evil.test/x.js"></script><iframe src="https://evil.test"></iframe>', "html");
    expect(html).toContain("<p>kept</p>");
    expect(html).not.toContain("evil.test");
    expect(html).not.toContain("<iframe");
  });

  it("keeps inline scripts and handlers (they are sandboxed)", () => {
    const { html } = build('<button onclick="x()">go</button><script>window.x=1</script>', "html");
    expect(html).toContain('onclick="x()"');
    expect(html).toContain("window.x=1");
  });

  it("strips an unterminated iframe", () => {
    expect(stripExternalEmbeds("<p>a</p><iframe src=x")).toBe("<p>a</p>");
  });
});

describe("JSX documents", () => {
  it("renders the fixtures through the transform", () => {
    for (const [file, lang] of [["pricing-card.jsx", "jsx"], ["profile-card.jsx", "jsx"], ["navbar.tsx", "tsx"]] as const) {
      const { html, notices } = build(fixture(file), lang);
      expect(html).toContain("window.__module = {}");
      expect(html).toContain("window.__ghostMount()");
      expect(notices).toEqual([]);
    }
  });

  it("uses the classic runtime so it relies on the global React", () => {
    const { js } = transformJsx(fixture("pricing-card.jsx"));
    expect(js).toContain("React.createElement");
    expect(js).not.toContain("require(");
  });

  it("falls back to the last capitalised function when nothing is exported", () => {
    const r = transformJsx("function Foo() { return <div>a</div>; }\nfunction Bar() { return <div>b</div>; }");
    expect(r.fallbackName).toBe("Bar");
    expect(build("function Foo() { return <div>a</div>; }", "jsx").html).toContain("exports.__fallback = Foo;");
  });

  it("throws on code that does not compile", () => {
    expect(() => build("export default function X() { return <div> }", "jsx")).toThrow();
  });

  it("cannot be broken out of with </script> or <!-- in a string", () => {
    const { html } = build('export default function X() { return <p>{"</script><img src=x onerror=alert(1)>"}</p>; }', "jsx");
    const scripts = html.match(/<\/script>/g)!.length;
    const opened = html.match(/<script[\s>]/g)!.length;
    expect(scripts).toBe(opened);
    expect(html).not.toContain("</script><img");
    expect(escapeForScript("a</SCRIPT>b<!--c")).toBe("a<\\/SCRIPT>b<\\!--c");
  });
});

describe("import stubbing", () => {
  it("destructures react imports from the global React", () => {
    const { code, stubbed } = stubImports('import React, { useState, useEffect as useFx } from "react";\nconst a = 1;');
    expect(code).toContain("const { useState, useFx: useFx } = React;".replace("useFx: useFx", "useEffect: useFx"));
    expect(code).not.toContain("import");
    expect(stubbed).toEqual([]);
  });

  it("drops a default-only react import", () => {
    expect(stubImports('import React from "react";\nx').code.trim()).toBe("x");
  });

  it("stubs other packages, local files, namespaces and aliases", () => {
    const src = [
      'import { Mail, Lock as LockIcon } from "lucide-react";',
      'import Button from "./Button";',
      'import * as UI from "@acme/ui";',
      'import "./styles.css";',
      'import type { Props } from "./types";',
      "export default function X() { return <Button><Mail /></Button>; }",
    ].join("\n");
    const { code, stubbed } = stubImports(src);
    expect(code).toContain('const Mail = __stub("Mail"), LockIcon = __stub("Lock");');
    expect(code).toContain('const Button = __stub("Button");');
    expect(code).toContain("const UI = new Proxy");
    expect(code).not.toMatch(/\bimport\b/);
    expect(stubbed.sort()).toEqual(["./Button", "@acme/ui", "lucide-react"]);
  });

  it("handles multi-line imports", () => {
    const { code } = stubImports('import {\n  A,\n  B,\n} from "pkg";\nlet z;');
    expect(code).toContain('const A = __stub("A"), B = __stub("B");');
  });

  it("adds the notice when imports were stubbed", () => {
    const src = 'import { Mail } from "lucide-react";\nexport default function X() { return <Mail />; }';
    expect(build(src, "jsx").notices).toEqual([IMPORT_NOTICE]);
  });
});

describe("frame messages", () => {
  it("accepts the expected shapes and rejects the rest", () => {
    expect(FrameMessage.safeParse({ type: "ready", height: 300 }).success).toBe(true);
    expect(FrameMessage.safeParse({ type: "resize", height: 0 }).success).toBe(true);
    expect(FrameMessage.safeParse({ type: "error", message: "boom" }).success).toBe(true);
    expect(FrameMessage.safeParse({ type: "ready", height: -1 }).success).toBe(false);
    expect(FrameMessage.safeParse({ type: "ready", height: "tall" }).success).toBe(false);
    expect(FrameMessage.safeParse({ type: "navigate", url: "x" }).success).toBe(false);
    expect(FrameMessage.safeParse({ type: "error", message: "x".repeat(501) }).success).toBe(false);
  });
});
