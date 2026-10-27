// GET /api/health: provider, model, ok, last latency.
// Spec: specs/07 §7.3
// Task: T2.1

export async function GET() {
  return Response.json({ error: { code: "NOT_IMPLEMENTED", message: "See tasks/day-2.md T2.1" } }, { status: 501 });
}
