// POST /api/possess → text/event-stream of GhostEvents (possess | refine | ask).
// Spec: specs/06, specs/03 §3.4
// Task: T2.1
import { possess } from "@/lib/ghost/possess";
import { encodeSse } from "@/lib/ghost/sse";
import { costFor, hashIp, rateLimitMessage } from "@/lib/limits/ratelimit";
import { gate } from "@/lib/limits/gate";
import { getProvider, getRateLimiter, recordLatency } from "@/lib/model/runtime";
import { ProviderError, type ModelProvider } from "@/lib/model/provider";
import { PossessRequest, type GhostEvent } from "@/types";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;
const APOLOGY = "My form wavers; the spell slipped. Ask me again and I will try once more.";

function jsonError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

function sseResponse(events: AsyncIterable<GhostEvent>) {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of events) controller.enqueue(encodeSse(ev));
      } catch {
        controller.enqueue(encodeSse({ type: "error", message: APOLOGY, retryable: true }));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

async function* one(...events: GhostEvent[]) {
  yield* events;
}

export async function POST(request: Request) {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return jsonError(413, "TOO_LARGE", "Request body is too large.");

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return jsonError(400, "BAD_JSON", "Request body must be JSON.");
  }
  const parsed = PossessRequest.safeParse(body);
  if (!parsed.success) return jsonError(400, "BAD_REQUEST", "Request does not match the possession schema.");
  const req = parsed.data;

  // Gate first: a refused request costs no tokens and no rate-limit allowance.
  const gated = gate(req.code, req.language);
  if (!gated.ok) {
    log(req, gated.stats, 0, "none", `refused:${gated.reason}`);
    return sseResponse(one({ type: "refusal", reason: gated.reason, message: gated.message }, { type: "done", ms: 0, model: "none" }));
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const taken = getRateLimiter().take(hashIp(ip), costFor(req.mode));
  if (!taken.ok) {
    log(req, gated.stats, 0, "none", "refused:rate_limited");
    return sseResponse(
      one({ type: "refusal", reason: "rate_limited", message: rateLimitMessage(taken.retryAfterMs) }, { type: "done", ms: 0, model: "none" }),
    );
  }

  let provider: ModelProvider;
  try {
    provider = getProvider();
  } catch (e) {
    const retryable = e instanceof ProviderError ? e.retryable : false;
    log(req, gated.stats, 0, "none", "error:provider");
    return sseResponse(one({ type: "error", message: APOLOGY, retryable }));
  }

  const started = Date.now();
  async function* run() {
    let outcome = "ok";
    let model = provider.id;
    try {
      for await (const ev of possess(req, provider, request.signal)) {
        if (ev.type === "done") {
          model = ev.model;
          recordLatency(ev.ms);
        } else if (ev.type === "error") outcome = "error";
        else if (ev.type === "refusal") outcome = `refused:${ev.reason}`;
        yield ev;
      }
    } catch (e) {
      outcome = "error";
      throw e;
    } finally {
      log(req, gated.stats,Date.now() - started, model, outcome);
    }
  }
  return sseResponse(run());
}

// Spec 03 §3.5: metadata only, never the code.
function log(req: PossessRequest, stats: { lines: number; chars: number }, ms: number, model: string, outcome: string) {
  console.log(
    JSON.stringify({ preset: req.preset, intensity: req.intensity, language: req.language, lines: stats.lines, chars: stats.chars, ms, model, outcome }),
  );
}
