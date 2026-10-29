import { describe, expect, it } from "vitest";
import { streamGhost } from "@/lib/ghost/client";
import { chooseMode, historyOf, initialSession, reducer, selectedVersion, type Action, type Session } from "@/lib/ghost/session";
import { encodeSse } from "@/lib/ghost/sse";
import { PossessRequest, type GhostEvent } from "@/types";

const req = (over: Partial<PossessRequest> = {}) =>
  PossessRequest.parse({ mode: "possess", code: "<button class='a'>Go</button>", language: "html", preset: "victorian", intensity: "haunt", ...over });

const run = (actions: Action[], from: Session = initialSession) => actions.reduce(reducer, from);
const ev = (event: GhostEvent): Action => ({ type: "event", event });

const successful: Action[] = [
  { type: "start_possess", request: req() },
  ev({ type: "whisper", delta: "Ah, " }),
  ev({ type: "whisper", delta: "delicious." }),
  ev({ type: "code", code: "<button class='b'>Go</button>", language: "html" }),
  ev({ type: "changes", items: ["Re-themed"] }),
  ev({ type: "effects", names: ["ghost-candle"] }),
  ev({ type: "done", ms: 5, model: "m" }),
];

describe("possession flow", () => {
  it("starts with the original as version 0 and the ghost thinking", () => {
    const s = run([{ type: "start_possess", request: req() }]);
    expect(s.versions).toHaveLength(1);
    expect(s.versions[0]).toMatchObject({ id: 0, preset: null, code: "<button class='a'>Go</button>" });
    expect(s.status).toBe("thinking");
    expect(s.busy).toBe(true);
    expect(s.messages).toEqual([{ id: 1, role: "ghost", text: "" }]);
  });

  it("streams the whisper into the ghost message and speaks", () => {
    const s = run(successful.slice(0, 3));
    expect(s.status).toBe("speaking");
    expect(s.messages.at(-1)?.text).toBe("Ah, delicious.");
  });

  it("adds a possessed version and selects it on done", () => {
    const s = run(successful);
    expect(s.busy).toBe(false);
    expect(s.status).toBe("idle");
    expect(s.versions.map((v) => v.id)).toEqual([0, 1]);
    expect(selectedVersion(s)).toMatchObject({ id: 1, preset: "victorian", whisper: "Ah, delicious.", changes: ["Re-themed"], effects: ["ghost-candle"] });
  });

  it("a new possession resets the session", () => {
    const s = run([...successful, { type: "start_possess", request: req({ code: "<p class='z'>Other component</p>" }) }]);
    expect(s.versions).toHaveLength(1);
    expect(s.messages).toHaveLength(1);
    expect(s.versions[0].code).toContain("Other component");
  });
});

describe("chat", () => {
  const afterFirst = run(successful);

  it("a refinement adds the user message, then a new version after the selected one", () => {
    const s = run(
      [
        { type: "start_chat", request: req({ mode: "refine", message: "less scary" }), userText: "less scary" },
        ev({ type: "whisper", delta: "Softer." }),
        ev({ type: "code", code: "<button class='c'>Go</button>", language: "html" }),
        ev({ type: "done", ms: 1, model: "m" }),
      ],
      afterFirst,
    );
    expect(s.messages.map((m) => m.role)).toEqual(["ghost", "user", "ghost"]);
    expect(s.versions.map((v) => v.id)).toEqual([0, 1, 2]);
    expect(s.selectedId).toBe(2);
  });

  it("ids stay unique across messages", () => {
    const s = run([{ type: "start_chat", request: req({ mode: "ask" }), userText: "why?" }, ev({ type: "done", ms: 1, model: "m" })], afterFirst);
    const ids = s.messages.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("an ask or a refine with no code adds no version", () => {
    const s = run(
      [{ type: "start_chat", request: req({ mode: "ask" }), userText: "why?" }, ev({ type: "whisper", delta: "Because." }), ev({ type: "done", ms: 1, model: "m" })],
      afterFirst,
    );
    expect(s.versions).toHaveLength(2);
    expect(s.messages.at(-1)?.text).toBe("Because.");
  });

  it("refining a selected earlier version still appends a new version at the end", () => {
    const back = reducer(afterFirst, { type: "select", id: 0 });
    expect(back.selectedId).toBe(0);
    const s = run([{ type: "start_chat", request: req({ mode: "refine" }), userText: "more fog" }, ev({ type: "code", code: "<i>x</i>", language: "html" }), ev({ type: "done", ms: 1, model: "m" })], back);
    expect(s.versions.map((v) => v.id)).toEqual([0, 1, 2]);
    expect(s.selectedId).toBe(2);
  });

  it("ignores selecting a version that does not exist", () => {
    expect(reducer(afterFirst, { type: "select", id: 99 })).toBe(afterFirst);
  });
});

describe("failures", () => {
  it("shows a refusal in character and calms down later", () => {
    let s = run([{ type: "start_possess", request: req() }, ev({ type: "refusal", reason: "rate_limited", message: "Even ghosts need rest." }), ev({ type: "done", ms: 0, model: "none" })]);
    expect(s.status).toBe("refusing");
    expect(s.busy).toBe(false);
    expect(s.messages.at(-1)?.text).toBe("Even ghosts need rest.");
    s = reducer(s, { type: "calm" });
    expect(s.status).toBe("idle");
  });

  it("keeps the request for retry after a retryable error and replaces the failed reply", () => {
    const failed = run([{ type: "start_possess", request: req() }, ev({ type: "error", message: "The spell slipped.", retryable: true })]);
    expect(failed.retryable).toBe(true);
    const again = reducer(failed, { type: "retry" });
    expect(again.busy).toBe(true);
    expect(again.messages).toHaveLength(1);
    expect(again.messages[0].text).toBe("");
    expect(again.lastRequest).toBe(failed.lastRequest);
  });

  it("does not retry while busy", () => {
    const busy = run([{ type: "start_possess", request: req() }]);
    expect(reducer(busy, { type: "retry" })).toBe(busy);
  });

  it("stopping clears the busy state", () => {
    const s = run([{ type: "start_possess", request: req() }, { type: "stopped" }]);
    expect(s.busy).toBe(false);
    expect(s.status).toBe("idle");
  });
});

describe("chooseMode", () => {
  it("treats plain questions as ask", () => {
    expect(chooseMode("why did you change the button?")).toBe("ask");
    expect(chooseMode("What does ghost-candle do?")).toBe("ask");
  });
  it("treats requests as refine, even when phrased as questions", () => {
    expect(chooseMode("less scary")).toBe("refine");
    expect(chooseMode("keep my brand blue")).toBe("refine");
    expect(chooseMode("can you make it less scary?")).toBe("refine");
    expect(chooseMode("add fog only to the header")).toBe("refine");
    expect(chooseMode("how about more fog?")).toBe("refine");
    expect(chooseMode("less scary?")).toBe("refine");
  });
  it("treats statements without a question mark as refine", () => {
    expect(chooseMode("I would like it spookier")).toBe("refine");
  });
});

describe("historyOf", () => {
  it("keeps the last six non-empty turns and trims long text", () => {
    const messages = Array.from({ length: 9 }, (_, i) => ({ id: i, role: (i % 2 ? "user" : "ghost") as "user" | "ghost", text: `m${i}` }));
    messages.push({ id: 99, role: "ghost", text: "" });
    messages[8].text = "x".repeat(3000);
    const h = historyOf(messages);
    expect(h).toHaveLength(6);
    expect(h[0].text).toBe("m3");
    expect(h.at(-1)?.text).toHaveLength(2000);
  });
});

describe("streamGhost", () => {
  const sseBody = (events: GhostEvent[]) =>
    new ReadableStream<Uint8Array>({
      start(c) {
        events.forEach((e) => c.enqueue(encodeSse(e)));
        c.close();
      },
    });
  const collect = async (fetchFn: typeof fetch, signal = new AbortController().signal) => {
    const out: GhostEvent[] = [];
    for await (const e of streamGhost(req(), signal, fetchFn)) out.push(e);
    return out;
  };

  it("yields the server's events", async () => {
    const events: GhostEvent[] = [{ type: "whisper", delta: "hi" }, { type: "done", ms: 1, model: "m" }];
    const out = await collect((async () => new Response(sseBody(events))) as unknown as typeof fetch);
    expect(out).toEqual(events);
  });

  it("turns a network failure into a retryable error", async () => {
    const out = await collect((async () => Promise.reject(new TypeError("offline"))) as unknown as typeof fetch);
    expect(out).toEqual([expect.objectContaining({ type: "error", retryable: true })]);
  });

  it("turns HTTP 5xx into a retryable error and 400 into a non-retryable one", async () => {
    const r500 = await collect((async () => new Response("x", { status: 500 })) as unknown as typeof fetch);
    expect(r500[0]).toMatchObject({ type: "error", retryable: true });
    const r400 = await collect((async () => new Response("x", { status: 400 })) as unknown as typeof fetch);
    expect(r400[0]).toMatchObject({ type: "error", retryable: false });
  });

  it("stays silent when the caller aborted", async () => {
    const ac = new AbortController();
    ac.abort();
    const out = await collect((async () => Promise.reject(new DOMException("aborted", "AbortError"))) as unknown as typeof fetch, ac.signal);
    expect(out).toEqual([]);
  });
});
