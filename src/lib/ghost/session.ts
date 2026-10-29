// Client-side session state: chat, versions and the possession event stream, as a pure reducer.
// Spec: specs/06 §6.2, §6.7, specs/01 US-4
// Task: T2.5
import type { GhostEvent, Language, PossessRequest, PresetId, Version } from "@/types";

export type AvatarStatus = "idle" | "thinking" | "speaking" | "refusing";

export interface ChatMessage {
  id: number;
  role: "user" | "ghost";
  text: string;
}

interface Pending {
  whisper: string;
  code: { code: string; language: Language } | null;
  changes: string[];
  effects: string[];
  preset: PresetId;
}

export interface Session {
  versions: Version[];
  selectedId: number | null;
  messages: ChatMessage[];
  status: AvatarStatus;
  busy: boolean;
  pending: Pending | null;
  /** The request in flight or last sent, kept so a retryable failure can be re-sent. */
  lastRequest: PossessRequest | null;
  retryable: boolean;
  nextId: number;
}

export const initialSession: Session = {
  versions: [],
  selectedId: null,
  messages: [],
  status: "idle",
  busy: false,
  pending: null,
  lastRequest: null,
  retryable: false,
  nextId: 1,
};

export type Action =
  /** A fresh possession of pasted code: starts a new session whose version 0 is the original. */
  | { type: "start_possess"; request: PossessRequest }
  /** A refinement or question about the selected version. */
  | { type: "start_chat"; request: PossessRequest; userText: string }
  | { type: "retry" }
  | { type: "event"; event: GhostEvent }
  | { type: "stopped" }
  | { type: "select"; id: number }
  | { type: "calm" };

const FALLBACK_WHISPER = "…";

export function selectedVersion(s: Session): Version | null {
  return s.versions.find((v) => v.id === s.selectedId) ?? null;
}

/** Start a reply: `messages` is the chat so far, to which an empty ghost message is appended and then filled by whisper deltas. */
function begin(s: Session, request: PossessRequest, messages: ChatMessage[]): Session {
  return {
    ...s,
    messages: [...messages, { id: s.nextId, role: "ghost", text: "" }],
    status: "thinking",
    busy: true,
    pending: { whisper: "", code: null, changes: [], effects: [], preset: request.preset },
    lastRequest: request,
    retryable: false,
    nextId: s.nextId + 1,
  };
}

function setLastGhost(messages: ChatMessage[], text: string): ChatMessage[] {
  const i = messages.length - 1;
  return messages.map((m, idx) => (idx === i ? { ...m, text } : m));
}

export function reducer(s: Session, a: Action): Session {
  switch (a.type) {
    case "start_possess": {
      const original: Version = {
        id: 0,
        code: a.request.code,
        language: a.request.language,
        preset: null,
        whisper: "",
        changes: [],
        effects: [],
      };
      const fresh: Session = { ...initialSession, versions: [original], selectedId: 0 };
      return begin(fresh, a.request, []);
    }
    case "start_chat": {
      const user: ChatMessage = { id: s.nextId, role: "user", text: a.userText };
      const next = { ...s, nextId: s.nextId + 1 };
      return begin(next, a.request, [...s.messages, user]);
    }
    case "retry": {
      if (!s.lastRequest || s.busy) return s;
      // Drop the failed ghost reply and ask again; the user's own message stays.
      const kept = s.messages.at(-1)?.role === "ghost" ? s.messages.slice(0, -1) : s.messages;
      return begin({ ...s, messages: kept, nextId: s.nextId }, s.lastRequest, kept);
    }
    case "event": {
      const ev = a.event;
      const p = s.pending;
      switch (ev.type) {
        case "whisper": {
          if (!p) return s;
          const whisper = p.whisper + ev.delta;
          return { ...s, status: "speaking", pending: { ...p, whisper }, messages: setLastGhost(s.messages, whisper) };
        }
        case "code":
          return p ? { ...s, pending: { ...p, code: { code: ev.code, language: ev.language } } } : s;
        case "changes":
          return p ? { ...s, pending: { ...p, changes: ev.items } } : s;
        case "effects":
          return p ? { ...s, pending: { ...p, effects: ev.names } } : s;
        case "refusal":
          return { ...s, busy: false, status: "refusing", pending: null, retryable: false, messages: setLastGhost(s.messages, ev.message) };
        case "error":
          return { ...s, busy: false, status: "idle", pending: null, retryable: ev.retryable, messages: setLastGhost(s.messages, ev.message) };
        case "done": {
          if (!p) return { ...s, busy: false, status: s.status === "refusing" ? "refusing" : "idle" };
          const whisper = p.whisper.trim() || FALLBACK_WHISPER;
          const messages = setLastGhost(s.messages, whisper);
          if (!p.code) return { ...s, busy: false, status: "idle", pending: null, messages };
          const id = s.versions.reduce((m, v) => Math.max(m, v.id), 0) + 1;
          const version: Version = { id, code: p.code.code, language: p.code.language, preset: p.preset, whisper, changes: p.changes, effects: p.effects };
          return { ...s, busy: false, status: "idle", pending: null, messages, versions: [...s.versions, version], selectedId: id };
        }
      }
      return s;
    }
    case "stopped":
      return { ...s, busy: false, status: "idle", pending: null, retryable: false };
    case "select":
      return s.versions.some((v) => v.id === a.id) ? { ...s, selectedId: a.id } : s;
    case "calm":
      return s.status === "refusing" ? { ...s, status: "idle" } : s;
  }
}

// Imperative cues: if any appears the message is a request to change the code, even when phrased as a question.
const IMPERATIVE =
  /\b(make|add|remove|keep|change|use|fix|swap|replace|turn|try|drop|give|put|set|reduce|increase|tone|bring|apply|show|hide|delete|restore|revert|undo|less|more|lighter|darker|softer|bolder)\b/i;

const POLITE_REQUEST = /^\s*((can|could|would|will)\s+you\b|please\b|how about\b|what about\b|what if\b)/i;
const QUESTION_WORD = /^\s*(why|what|how|which|who|when|where|do|does|did|is|are|was|were)\b/i;

/**
 * Spec 06 §6.2: a question mark and no imperative verb means a question; anything else is a refinement.
 * Refinement: questions that open with a question word are asks even if a verb like "change" appears
 * ("why did you change the button?"), while polite requests ("can you…", "how about…") are refinements.
 */
export function chooseMode(text: string): "refine" | "ask" {
  if (!text.includes("?")) return "refine";
  if (POLITE_REQUEST.test(text)) return "refine";
  if (QUESTION_WORD.test(text)) return "ask";
  return IMPERATIVE.test(text) ? "refine" : "ask";
}

/** The last 6 settled turns for the request, excluding the ghost reply being generated. */
export function historyOf(messages: ChatMessage[]): { role: "user" | "ghost"; text: string }[] {
  return messages
    .filter((m) => m.text.trim().length > 0)
    .slice(-6)
    .map((m) => ({ role: m.role, text: m.text.slice(0, 2000) }));
}
