# 07 · Model runtime

`src/lib/model/*`. One interface, two providers.

```ts
interface ModelProvider {
  id: string;                                         // "gemini-gemma:gemma-4-31b-it"
  health(): Promise<{ ok: boolean; detail: string }>;
  stream(input: { system: string; user: string; temperature: number; maxOutputTokens: number },
         signal: AbortSignal): AsyncIterable<string>;
}
```

## 7.1 Gemma via the Gemini API (default)

- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse`, header `x-goog-api-key`.
- Body: `systemInstruction`, `contents`, `generationConfig: { temperature, maxOutputTokens, thinkingConfig: { thinkingLevel: "minimal" } }`.
- **Do not set `responseMimeType`** (Gemma returns HTTP 500; learned on GuideMe).
- Skip parts with `thought: true`.
- Retries: 5xx, 429 and network errors, backoff 1 s / 3 s; switch from `gemma-4-31b-it` to `gemma-4-26b-a4b-it` on a 429 or after 2 failures. Total budget 60 s, then a retryable error.
- Timeouts: 20 s to first chunk.

## 7.2 OpenAI-compatible provider (Gemma on a DigitalOcean GPU Droplet, optional)

- `POST {OPENAI_COMPAT_BASE_URL}/v1/chat/completions` with `stream: true`; works with vLLM or Ollama serving a Gemma model.
- Used if `MODEL_PROVIDER=openai-compat`. The UI footer shows which model and where it runs.
- Decision on whether to run it during judging depends on credits/cost (ADR 0002). The post explains it either way: the same app runs on a self-hosted open model by changing one env var.

## 7.3 Health and footer

`GET /api/health` returns provider, model, ok, last latency. The page footer shows "Possessed by Gemma 4 31B · hosted on DigitalOcean".

`/api/health` answers 503 when `ok` is false so the App Platform health check reflects the real state.
`/api/health?live=1` is a liveness probe that never calls the model; App Platform uses it (spec 08), so a Gemini outage cannot get the container restarted.
