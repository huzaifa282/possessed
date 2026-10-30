import { describe, expect, it } from "vitest";
import { contrastFrameScript, createContrastKit, fixContrastMessage } from "@/lib/a11y/contrast";
import { FrameMessage } from "@/lib/preview/messages";
import { buildSrcdoc } from "@/lib/preview/srcdoc";

const kit = createContrastKit();

describe("WCAG contrast math", () => {
  it("gives 21:1 for black on white and 1:1 for identical colours", () => {
    expect(kit.ratio([0, 0, 0, 1], [255, 255, 255, 1])).toBeCloseTo(21, 5);
    expect(kit.ratio([120, 30, 200, 1], [120, 30, 200, 1])).toBeCloseTo(1, 5);
  });

  it("matches the published #767676-on-white value (4.54:1)", () => {
    expect(kit.ratio([118, 118, 118, 1], [255, 255, 255, 1])).toBeCloseTo(4.54, 2);
  });

  it("asks 3:1 for large text and 4.5:1 for the rest", () => {
    expect(kit.required(24, 400)).toBe(3);
    expect(kit.required(18.66, 700)).toBe(3);
    expect(kit.required(18.66, 400)).toBe(4.5);
    expect(kit.required(16, 700)).toBe(4.5);
  });

  it("composites a translucent colour over its backdrop", () => {
    expect(kit.over([255, 255, 255, 0.5], [0, 0, 0, 1])).toEqual([127.5, 127.5, 127.5, 1]);
  });

  it("parses rgb() and rgba() computed styles, and gives up on the rest without a document", () => {
    expect(kit.parse("rgb(10, 20, 30)")).toEqual([10, 20, 30, 1]);
    expect(kit.parse("rgba(10, 20, 30, 0.5)")).toEqual([10, 20, 30, 0.5]);
    expect(kit.parse("rgb(10 20 30 / 50%)")).toEqual([10, 20, 30, 0.5]);
    expect(kit.parse("oklch(0.7 0.1 200)")).toBeNull();
  });
});

describe("frame script", () => {
  it("is self-contained source that defines the measurer", () => {
    const src = contrastFrameScript();
    expect(src).toContain("__ghostMeasure");
    expect(() => new Function(src)).not.toThrow();
  });

  it("is injected into both HTML and JSX preview documents", () => {
    const html = buildSrcdoc({ code: "<p>hello world</p>", language: "html", appOrigin: "http://localhost:3000" }).html;
    const jsx = buildSrcdoc({ code: "export default function A(){return <p>hi</p>}", language: "jsx", appOrigin: "http://localhost:3000" }).html;
    expect(html).toContain("__ghostMeasure");
    expect(jsx).toContain("__ghostMeasure");
  });

  it("posts a message the parent accepts, and the parent rejects a malformed one", () => {
    expect(FrameMessage.safeParse({ type: "contrast", failures: [{ text: "Buy", ratio: 2.1, required: 4.5 }], unmeasured: 0 }).success).toBe(true);
    expect(FrameMessage.safeParse({ type: "contrast", failures: [{ text: "Buy", ratio: 2.1, required: 5 }], unmeasured: 0 }).success).toBe(false);
  });
});

describe("Fix contrast message", () => {
  it("lists the offenders with ratios, caps the list, and is a refinement (no question mark)", () => {
    const failures = Array.from({ length: 6 }, (_, i) => ({ text: `Text ${i}`, ratio: 2.5, required: 4.5 as const }));
    const msg = fixContrastMessage(failures);
    expect(msg).toContain('"Text 0" (2.5:1, needs 4.5:1)');
    expect(msg).not.toContain("Text 4");
    expect(msg).not.toContain("?");
  });
});
