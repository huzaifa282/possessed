// Browser side of /api/possess: POST the request, yield validated GhostEvents.
// Spec: specs/06, specs/02 (SSE)
// Task: T2.5
import type { GhostEvent, PossessRequest } from "@/types";
import { parseSse } from "./sse";

const UNREACHABLE = "The veil is thin and I cannot reach the other side. Check your connection and try again.";
const SERVER_TROUBLE = "Something stirred in the walls and the spell slipped. Try again in a moment.";
const BAD_REQUEST = "I could not make sense of that request.";

export async function* streamGhost(req: PossessRequest, signal: AbortSignal, fetchFn: typeof fetch = fetch): AsyncGenerator<GhostEvent> {
  let res: Response;
  try {
    res = await fetchFn("/api/possess", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal,
    });
  } catch {
    if (!signal.aborted) yield { type: "error", message: UNREACHABLE, retryable: true };
    return;
  }
  if (!res.ok || !res.body) {
    const retryable = res.status >= 500 || res.status === 429;
    yield { type: "error", message: res.status >= 500 ? SERVER_TROUBLE : BAD_REQUEST, retryable };
    return;
  }
  try {
    yield* parseSse(res.body);
  } catch {
    if (!signal.aborted) yield { type: "error", message: UNREACHABLE, retryable: true };
  }
}
