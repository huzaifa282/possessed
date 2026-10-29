// Process-wide singletons for the server: model provider, rate limiter, last latency.
// Spec: specs/07-model-runtime.md §7.3, specs/03-input-and-limits.md §3.4
// Task: T2.1
import { RateLimiter } from "@/lib/limits/ratelimit";
import { createProvider, type ModelProvider } from "./provider";

let provider: ModelProvider | undefined;
let limiter: RateLimiter | undefined;
let latency: number | null = null;

/** One provider per process so the Gemini model switch (31B → 26B) sticks between requests. */
export function getProvider(): ModelProvider {
  return (provider ??= createProvider(process.env));
}

export function getRateLimiter(): RateLimiter {
  if (!limiter) {
    const perHour = Number(process.env.RATE_LIMIT_PER_HOUR);
    limiter = new RateLimiter({ perHour: Number.isFinite(perHour) && perHour > 0 ? perHour : 20 });
  }
  return limiter;
}

export function recordLatency(ms: number) {
  latency = ms;
}

export function lastLatency(): number | null {
  return latency;
}
