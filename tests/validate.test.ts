import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validate } from "@/lib/ghost/validate";
import type { Language } from "@/types";

const fixture = (name: string) => readFileSync(path.resolve(__dirname, "fixtures/components", name), "utf8");

const JSX = fixture("pricing-card.jsx");
const HTML = fixture("login-form.html");

const run = (original: string, code: string, language: Language, possessWords = false) =>
  validate({ original, language, output: { code, language }, possessWords });

describe("validate: language and parsing", () => {
  it("passes the original through unchanged", () => {
    expect(run(JSX, JSX, "jsx").ok).toBe(true);
    expect(run(HTML, HTML, "html").ok).toBe(true);
  });

  it("rejects a language mismatch", () => {
    const r = validate({ original: JSX, language: "jsx", output: { code: JSX, language: "tsx" }, possessWords: false });
    expect(r).toMatchObject({ ok: false });
  });

  it("rejects empty code", () => {
    expect(run(JSX, "  ", "jsx").ok).toBe(false);
  });

  it("catches broken JSX", () => {
    const broken = JSX.replace("</button>", "");
    const r = run(JSX, broken, "jsx");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/does not compile/);
  });

  it("accepts TSX with types", () => {
    const tsx = fixture("navbar.tsx");
    expect(run(tsx, tsx, "tsx").ok).toBe(true);
  });

  it("rejects <script src> and <iframe> in HTML", () => {
    expect(run(HTML, `${HTML}<script src="x.js"></script>`, "html").ok).toBe(false);
    expect(run(HTML, `${HTML}<iframe src="x"></iframe>`, "html").ok).toBe(false);
  });

  it("allows inline <script> blocks in HTML", () => {
    expect(run(HTML, `${HTML}<script>console.log(1)</script>`, "html").ok).toBe(true);
  });
});

describe("validate: structure", () => {
  it("catches a renamed component", () => {
    const r = run(JSX, JSX.replace("PricingCard", "SpookyCard"), "jsx");
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toContain("PricingCard");
  });

  it("catches a lost default export", () => {
    const r = run(JSX, JSX.replace("export default function", "function"), "jsx");
    expect(r.ok).toBe(false);
  });

  it("keeps named exports", () => {
    const tsx = fixture("navbar.tsx");
    expect(run(tsx, tsx.replaceAll("Navbar", "Bar"), "tsx").ok).toBe(false);
  });

  it("limits top-level element changes in HTML", () => {
    const three = "<p>one two three</p><p>four five six</p><p>seven eight nine</p>";
    expect(run(three, three, "html").ok).toBe(true);
    expect(run(three, `${three}<p>ten eleven twelve</p>`, "html").ok).toBe(false);
  });
});

describe("validate: effects", () => {
  it("strips unknown ghost- classes and reports the known ones", () => {
    const code = JSX.replace('className="mx-auto', 'className="ghost-candle ghost-bogus mx-auto');
    const r = run(JSX, code, "jsx");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.strippedEffects).toEqual(["ghost-bogus"]);
      expect(r.effectsUsed).toEqual(["ghost-candle"]);
      expect(r.code).not.toContain("ghost-bogus");
      expect(r.code).toContain("ghost-candle mx-auto");
    }
  });

  it("does not touch CSS custom properties named --ghost-*", () => {
    const html = `${HTML}<style>.x { --ghost-glow: red; }</style>`;
    const r = run(HTML, html, "html");
    expect(r.ok && r.code.includes("--ghost-glow")).toBe(true);
  });

  it("works on class= in HTML", () => {
    const r = run(HTML, HTML.replace('class="mx-auto', 'class="ghost-fog ghost-nope mx-auto'), "html");
    expect(r.ok && r.strippedEffects).toEqual(["ghost-nope"]);
  });
});

describe("validate: text preservation", () => {
  it("accepts re-styled markup with the same words", () => {
    const styled = JSX.replaceAll("bg-white", "bg-stone-900").replaceAll("text-slate-900", "text-amber-100");
    expect(run(JSX, styled, "jsx").ok).toBe(true);
  });

  it("rejects rewritten copy when possessWords is off", () => {
    const rewritten = JSX.replace("Get started", "Sign the pact").replace("/month", "/moon").replace("Pro", "Cursed");
    const r = run(JSX, rewritten.replace("10 projects", "ten tombs").replace("Priority support", "Spectral aid").replace("Custom domains", "Haunted domains"), "jsx");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/visible text/);
  });

  it("allows rewritten copy when possessWords is on", () => {
    const rewritten = HTML.replace("Sign in", "Enter the crypt").replace("Email", "Your raven").replace("Password", "Secret word").replace("No account?", "Not yet dead?").replace("Create one", "Join us");
    expect(run(HTML, rewritten, "html", true).ok).toBe(true);
    expect(run(HTML, rewritten, "html", false).ok).toBe(false);
  });

  it("ignores colour and class changes in HTML", () => {
    const recoloured = HTML.replaceAll("bg-blue-600", "bg-red-900").replaceAll("text-gray-900", "text-yellow-100");
    expect(run(HTML, recoloured, "html").ok).toBe(true);
  });

  it("does not count inline style values as text", () => {
    const profile = fixture("profile-card.jsx");
    const recoloured = profile.replaceAll("#ffffff", "#111111").replaceAll("sans-serif", "Cinzel, serif");
    expect(run(profile, recoloured, "jsx").ok).toBe(true);
  });
});
