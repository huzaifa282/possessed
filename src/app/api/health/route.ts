// GET /api/health: provider, model, ok, last latency.
// Spec: specs/07 §7.3
// Task: T2.1
import { getProvider, lastLatency } from "@/lib/model/runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Liveness only (used by the App Platform probe every few seconds): never calls the model, so an upstream blip cannot get the app restarted.
  if (new URL(request.url).searchParams.has("live")) return Response.json({ ok: true });
  try {
    const provider = getProvider();
    const { ok, detail } = await provider.health();
    const [name, model] = provider.id.split(":");
    return Response.json({ provider: name, model, ok, detail, lastLatencyMs: lastLatency() }, { status: ok ? 200 : 503 });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "provider unavailable";
    return Response.json({ provider: null, model: null, ok: false, detail, lastLatencyMs: lastLatency() }, { status: 503 });
  }
}
