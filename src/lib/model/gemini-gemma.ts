// Gemma 4 via Gemini API: streamGenerateContent (SSE), skip thought parts, retries, model switch. No responseMimeType.
// Spec: specs/07-model-runtime.md §7.1
// Task: T1.7
import { ProviderError, type ModelProvider, type StreamInput } from "./provider";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const BACKOFF_MS = [1000, 3000];
const MAX_ATTEMPTS = 4;
const TOTAL_BUDGET_MS = 60_000;
const FIRST_CHUNK_MS = 20_000;

export interface GeminiGemmaOptions {
  apiKey: string;
  /** Primary first, fallback second. */
  models: string[];
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

class FirstChunkTimeout extends Error {}

export class GeminiGemmaProvider implements ModelProvider {
  private modelIdx = 0;
  private readonly fetchFn: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;

  constructor(private readonly opts: GeminiGemmaOptions) {
    if (opts.models.length === 0) throw new ProviderError("No Gemma models configured", false);
    this.fetchFn = opts.fetch ?? fetch;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.now = opts.now ?? Date.now;
  }

  private get model(): string {
    return this.opts.models[this.modelIdx];
  }

  get id(): string {
    return `gemini-gemma:${this.model}`;
  }

  private switchModel(): boolean {
    if (this.modelIdx + 1 >= this.opts.models.length) return false;
    this.modelIdx++;
    return true;
  }

  async health(): Promise<{ ok: boolean; detail: string }> {
    try {
      const res = await this.fetchFn(`${BASE}/${this.model}`, { headers: { "x-goog-api-key": this.opts.apiKey } });
      return { ok: res.ok, detail: res.ok ? `${this.model} reachable` : `HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : "network error" };
    }
  }

  async *stream(input: StreamInput, signal: AbortSignal): AsyncGenerator<string> {
    const started = this.now();
    let failures = 0;
    let lastError = "unknown error";

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (signal.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
      if (attempt > 0) {
        const wait = BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)];
        if (this.now() - started + wait > TOTAL_BUDGET_MS) break;
        await this.sleep(wait);
      }

      let yielded = false;
      try {
        for await (const text of this.attempt(input, signal)) {
          yielded = true;
          yield text;
        }
        return;
      } catch (e) {
        if (signal.aborted) throw e;
        // Once text has been emitted a retry would duplicate it.
        if (yielded) throw new ProviderError(`Stream interrupted: ${messageOf(e)}`, true);
        if (e instanceof ProviderError && !e.retryable) throw e;

        lastError = messageOf(e);
        failures++;
        const rateLimited = e instanceof ProviderError && e.status === 429;
        if (rateLimited || failures >= 2) {
          if (this.switchModel()) failures = 0;
        }
      }
    }
    throw new ProviderError(`Gemma is unavailable: ${lastError}`, true);
  }

  /** One HTTP request. Throws ProviderError (with status) or a network/timeout error. */
  private async *attempt(input: StreamInput, signal: AbortSignal): AsyncGenerator<string> {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => ctrl.abort(new FirstChunkTimeout()), FIRST_CHUNK_MS);
    const clearTimer = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };

    try {
      const res = await this.fetchFn(`${BASE}/${this.model}:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": this.opts.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: [{ role: "user", parts: [{ text: input.user }] }],
          // No responseMimeType: Gemma returns HTTP 500 with it.
          generationConfig: {
            temperature: input.temperature,
            maxOutputTokens: input.maxOutputTokens,
            thinkingConfig: { thinkingLevel: "minimal" },
          },
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const retryable = res.status === 429 || res.status >= 500;
        throw new ProviderError(`Gemini API returned HTTP ${res.status}`, retryable, res.status);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          clearTimer();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split(/\r?\n\r?\n/);
          buffer = events.pop() ?? "";
          for (const ev of events) yield* textOf(ev);
        }
        buffer += decoder.decode();
        if (buffer.trim()) yield* textOf(buffer);
      } finally {
        reader.cancel().catch(() => {});
      }
    } catch (e) {
      if (ctrl.signal.reason instanceof FirstChunkTimeout) throw new ProviderError("No response within 20 s", true);
      throw e;
    } finally {
      clearTimer();
      signal.removeEventListener("abort", onAbort);
    }
  }
}

function* textOf(event: string): Generator<string> {
  for (const line of event.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    let json: { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
    try {
      json = JSON.parse(payload);
    } catch {
      continue;
    }
    for (const part of json.candidates?.[0]?.content?.parts ?? []) {
      if (part.thought) continue;
      if (part.text) yield part.text;
    }
  }
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
