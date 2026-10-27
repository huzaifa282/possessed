// POST /api/possess → text/event-stream of GhostEvents (possess | refine | ask).
// Spec: specs/06, specs/03 §3.4
// Task: T2.1

export async function POST() {
  return Response.json({ error: { code: "NOT_IMPLEMENTED", message: "See tasks/day-2.md T2.1" } }, { status: 501 });
}
