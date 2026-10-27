import { describe, expect, it } from "vitest";
import { GhostEvent, PossessRequest, LIMITS } from "@/types";

// Smoke test so `npm test` passes on a fresh scaffold. Real tests: specs/09-testing.md.
describe("scaffold", () => {
  it("parses a possess request with defaults", () => {
    const req = PossessRequest.parse({ mode: "possess", code: "<button>Buy</button>", language: "html", preset: "victorian", intensity: "haunt" });
    expect(req.possessWords).toBe(false);
    expect(req.history).toEqual([]);
  });
  it("accepts a refusal event and has the size limits", () => {
    expect(GhostEvent.parse({ type: "refusal", reason: "too_big", message: "This is beyond my ghostly powers." }).type).toBe("refusal");
    expect(LIMITS.maxLines).toBe(200);
  });
});
