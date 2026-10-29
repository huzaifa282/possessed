// Server-sent-event framing for GhostEvents, shared by the API route and the browser client.
// Spec: specs/06-ghost-engine.md, specs/02-architecture.md
// Task: T2.1
import { GhostEvent } from "@/types";

const encoder = new TextEncoder();

export function encodeSse(ev: GhostEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(ev)}\n\n`);
}

/** Parse a byte stream of `data: {...}\n\n` frames into validated GhostEvents. Unparseable frames are skipped. */
export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<GhostEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const ev = frameToEvent(frame);
        if (ev) yield ev;
      }
    }
    const tail = frameToEvent(buf);
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

function frameToEvent(frame: string): GhostEvent | null {
  const data = frame
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trimStart())
    .join("\n");
  if (!data) return null;
  try {
    const parsed = GhostEvent.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
