// ModelProvider interface + factory from MODEL_PROVIDER.
// Spec: specs/07-model-runtime.md
// Task: T1.7
import { GeminiGemmaProvider } from "./gemini-gemma";

export interface StreamInput {
  system: string;
  user: string;
  temperature: number;
  maxOutputTokens: number;
}

export interface TokenUsage {
  promptTokens: number;
  outputTokens: number;
}

export interface ModelProvider {
  /** e.g. "gemini-gemma:gemma-4-31b-it" (reflects the model currently in use). */
  readonly id: string;
  /** Token counts reported by the most recent request, when the backend reports them. */
  readonly lastUsage?: TokenUsage | null;
  health(): Promise<{ ok: boolean; detail: string }>;
  stream(input: StreamInput, signal: AbortSignal): AsyncIterable<string>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export function createProvider(env: Record<string, string | undefined> = process.env): ModelProvider {
  const kind = env.MODEL_PROVIDER || "gemini-gemma";
  if (kind === "gemini-gemma") {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) throw new ProviderError("GEMINI_API_KEY is not set", false);
    const models = (env.GEMMA_MODELS || "gemma-4-31b-it,gemma-4-26b-a4b-it")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    return new GeminiGemmaProvider({ apiKey, models });
  }
  throw new ProviderError(`Unsupported MODEL_PROVIDER "${kind}"`, false);
}
