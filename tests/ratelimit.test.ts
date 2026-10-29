import { describe, expect, it } from "vitest";
import { RateLimiter, costFor, hashIp, rateLimitMessage } from "@/lib/limits/ratelimit";

const HOUR = 3_600_000;

function limiter(perHour = 4) {
  let t = 0;
  const rl = new RateLimiter({ perHour, now: () => t });
  return { rl, advance: (ms: number) => (t += ms) };
}

describe("RateLimiter", () => {
  it("empties after perHour takes", () => {
    const { rl } = limiter(3);
    for (let i = 0; i < 3; i++) expect(rl.take("a", 1).ok).toBe(true);
    expect(rl.take("a", 1).ok).toBe(false);
  });

  it("refills over time and reports retryAfterMs", () => {
    const { rl, advance } = limiter(4);
    for (let i = 0; i < 4; i++) rl.take("a", 1);
    const r = rl.take("a", 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Math.abs(r.retryAfterMs - HOUR / 4)).toBeLessThanOrEqual(1);
    advance(HOUR / 4);
    expect(rl.take("a", 1).ok).toBe(true);
  });

  it("charges half for ask", () => {
    const { rl } = limiter(2);
    for (let i = 0; i < 4; i++) expect(rl.take("a", costFor("ask")).ok).toBe(true);
    expect(rl.take("a", costFor("ask")).ok).toBe(false);
    expect(costFor("possess")).toBe(1);
    expect(costFor("refine")).toBe(1);
  });

  it("keeps keys independent and never exceeds capacity", () => {
    const { rl, advance } = limiter(1);
    expect(rl.take("a", 1).ok).toBe(true);
    expect(rl.take("b", 1).ok).toBe(true);
    expect(rl.take("a", 1).ok).toBe(false);
    advance(10 * HOUR);
    expect(rl.take("a", 1).ok).toBe(true);
    expect(rl.take("a", 1).ok).toBe(false);
  });
});

describe("helpers", () => {
  it("hashes IPs without leaking them", () => {
    const h = hashIp("203.0.113.9");
    expect(h).not.toContain("203");
    expect(h).toBe(hashIp("203.0.113.9"));
    expect(h).not.toBe(hashIp("203.0.113.10"));
  });

  it("rounds the wait up to whole minutes", () => {
    expect(rateLimitMessage(61_000)).toContain("2 minutes");
    expect(rateLimitMessage(100)).toContain("1 minute");
  });
});
