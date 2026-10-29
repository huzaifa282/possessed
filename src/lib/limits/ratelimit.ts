// Per-IP token bucket (in memory); ask costs half.
// Spec: specs/03-input-and-limits.md §3.4
// Task: T2.1
import { createHash } from "node:crypto";
import type { PossessRequest } from "@/types";

const HOUR_MS = 3_600_000;
const PRUNE_ABOVE = 10_000;

export type TakeResult = { ok: true } | { ok: false; retryAfterMs: number };

export interface RateLimiterOptions {
  perHour: number;
  now?: () => number;
}

interface Bucket {
  tokens: number;
  at: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly perHour: number;
  private readonly now: () => number;

  constructor(opts: RateLimiterOptions) {
    this.perHour = opts.perHour;
    this.now = opts.now ?? Date.now;
  }

  take(key: string, cost: number): TakeResult {
    const now = this.now();
    if (this.buckets.size > PRUNE_ABOVE) this.prune(now);

    const rate = this.perHour / HOUR_MS;
    const b = this.buckets.get(key) ?? { tokens: this.perHour, at: now };
    b.tokens = Math.min(this.perHour, b.tokens + (now - b.at) * rate);
    b.at = now;

    // Epsilon: refill arithmetic is floating point, so "exactly enough" can land a hair short.
    if (b.tokens < cost - 1e-9) {
      this.buckets.set(key, b);
      return { ok: false, retryAfterMs: Math.ceil((cost - b.tokens) / rate) };
    }
    b.tokens -= cost;
    this.buckets.set(key, b);
    return { ok: true };
  }

  /** Drop buckets that have refilled completely; they are indistinguishable from new ones. */
  private prune(now: number) {
    const rate = this.perHour / HOUR_MS;
    for (const [key, b] of this.buckets) {
      if (b.tokens + (now - b.at) * rate >= this.perHour) this.buckets.delete(key);
    }
  }
}

export function costFor(mode: PossessRequest["mode"]): number {
  return mode === "ask" ? 0.5 : 1;
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

const MESSAGES = [
  (m: number) => `Even ghosts need rest. Return in ${m} ${m === 1 ? "minute" : "minutes"}.`,
  (m: number) => `I must drift back to the shadows. Call me again in ${m} ${m === 1 ? "minute" : "minutes"}.`,
  (m: number) => `My strength is spent for now. Come back in ${m} ${m === 1 ? "minute" : "minutes"}.`,
];

export function rateLimitMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)](minutes);
}
