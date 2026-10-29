import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze, meterLevel } from "@/lib/limits/analyze";
import { SAMPLES } from "@/lib/samples";

const fixture = (name: string) => readFileSync(path.resolve(__dirname, "fixtures/components", name), "utf8").replace(/\r\n/g, "\n");

describe("samples", () => {
  const files: Record<string, string> = { "pricing-card": "pricing-card.jsx", "login-form": "login-form.html", navbar: "navbar.tsx" };

  it("offers the three samples from AC-1.3", () => {
    expect(SAMPLES.map((s) => s.label)).toEqual(["Pricing card", "Login form", "Navbar"]);
  });

  for (const s of SAMPLES) {
    it(`${s.id} matches its fixture, is detected as ${s.language} and passes the gate`, () => {
      expect(s.code).toBe(fixture(files[s.id]));
      const a = analyze(s.code);
      expect(a.detected).toBe(s.language);
      expect(a.canPossess).toBe(true);
      expect(a.level).toBe("ok");
    });
  }
});

describe("analyze", () => {
  it("lets the override win over detection", () => {
    const sample = SAMPLES[0];
    expect(analyze(sample.code, "tsx").language).toBe("tsx");
    expect(analyze(sample.code, null).language).toBe("jsx");
  });

  it("refuses oversized input client-side with the too_big reason", () => {
    const a = analyze(fixture("huge-dashboard.jsx"));
    expect(a.gate.ok).toBe(false);
    if (!a.gate.ok) expect(a.gate.reason).toBe("too_big");
    expect(a.level).toBe("over");
    expect(a.canPossess).toBe(false);
  });

  it("refuses whole pages and non-UI code", () => {
    const page = analyze(fixture("full-page.html"));
    expect(page.gate.ok === false && page.gate.reason).toBe("whole_page");
    const util = analyze(fixture("api-util.ts"));
    expect(util.gate.ok === false && util.gate.reason).toBe("not_ui");
  });

  it("cannot possess an empty editor", () => {
    const a = analyze("");
    expect(a.gate.ok === false && a.gate.reason).toBe("empty");
    expect(a.canPossess).toBe(false);
    expect(a.level).toBe("ok");
  });

  it("maps usage to meter levels per spec 03 §3.2", () => {
    expect(meterLevel(0.5)).toBe("ok");
    expect(meterLevel(0.7)).toBe("warn");
    expect(meterLevel(1)).toBe("warn");
    expect(meterLevel(1.01)).toBe("over");
  });
});
