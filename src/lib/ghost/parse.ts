// Streaming parser for <whisper>/<code>/<changes>/<effects>.
// Spec: specs/06-ghost-engine.md §6.5
// Task: T1.8
import { Language } from "@/types";

export type ParseEvent =
  | { type: "whisper"; delta: string }
  | { type: "code"; code: string; language: Language }
  | { type: "changes"; items: string[] }
  | { type: "effects"; names: string[] };

export interface ParsedOutput {
  whisper: string;
  code: { code: string; language: Language } | null;
  changes: string[];
  effects: string[];
  /** The stream ended inside <code>, so the code is incomplete and was discarded. */
  truncated: boolean;
}

type State = "preamble" | "whisper" | "between" | "code" | "changes" | "effects" | "done";

const WHISPER_CLOSE = "</whisper>";
const CODE_OPEN = /<code(\s[^>]*)?>/;
const CODE_CLOSE = "</code>";

/** Length of the longest suffix of `s` that is a proper prefix of `tag` (a tag possibly split across chunks). */
function partialTagLength(s: string, tag: string): number {
  for (let n = Math.min(s.length, tag.length - 1); n > 0; n--) {
    if (tag.startsWith(s.slice(-n))) return n;
  }
  return 0;
}

function stripFences(code: string): string {
  let c = code.trim();
  c = c.replace(/^```[\w-]*[ \t]*\r?\n/, "").replace(/\r?\n?```$/, "");
  return c.trim();
}

function listItems(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

function effectNames(text: string): string[] {
  const names = text
    .split(/[\s,]+/)
    .map((t) => t.replace(/[`.'"]/g, "").trim())
    .filter(Boolean);
  return [...new Set(names)];
}

export class GhostParser {
  private state: State = "preamble";
  private buf = "";
  private whisper = "";
  private lang: Language;
  private out: ParsedOutput = { whisper: "", code: null, changes: [], effects: [], truncated: false };

  constructor(private readonly fallbackLanguage: Language) {
    this.lang = fallbackLanguage;
  }

  push(chunk: string): ParseEvent[] {
    this.buf += chunk;
    return this.drain(false);
  }

  /** Call when the stream has ended. Tolerates a missing </changes> or </effects>. */
  end(): ParseEvent[] {
    const events = this.drain(true);
    this.out.whisper = this.whisper.trim();
    return events;
  }

  result(): ParsedOutput {
    return { ...this.out, whisper: this.whisper.trim() };
  }

  private drain(final: boolean): ParseEvent[] {
    const events: ParseEvent[] = [];
    let progressed = true;
    while (progressed && this.state !== "done") {
      progressed = this.step(events, final);
    }
    return events;
  }

  /** Runs one transition. Returns true if the buffer or state changed so another step may help. */
  private step(events: ParseEvent[], final: boolean): boolean {
    switch (this.state) {
      case "preamble": {
        const w = this.buf.indexOf("<whisper>");
        const c = this.buf.search(CODE_OPEN);
        if (w !== -1 && (c === -1 || w < c)) {
          this.buf = this.buf.slice(w + "<whisper>".length);
          this.state = "whisper";
          return true;
        }
        if (c !== -1) {
          this.state = "between";
          this.buf = this.buf.slice(c);
          return true;
        }
        const keep = this.buf.lastIndexOf("<");
        this.buf = keep === -1 ? "" : this.buf.slice(keep);
        return false;
      }

      case "whisper": {
        const close = this.buf.indexOf(WHISPER_CLOSE);
        if (close !== -1) {
          this.emitWhisper(events, this.buf.slice(0, close));
          this.buf = this.buf.slice(close + WHISPER_CLOSE.length);
          this.state = "between";
          return true;
        }
        const hold = final ? 0 : partialTagLength(this.buf, WHISPER_CLOSE);
        const safe = this.buf.slice(0, this.buf.length - hold);
        if (safe) {
          this.emitWhisper(events, safe);
          this.buf = this.buf.slice(safe.length);
        }
        if (final) this.state = "done";
        return false;
      }

      case "between": {
        const candidates = [
          { i: this.buf.search(CODE_OPEN), next: "code" as const },
          { i: this.buf.indexOf("<changes>"), next: "changes" as const },
          { i: this.buf.indexOf("<effects>"), next: "effects" as const },
        ]
          .filter((c) => c.i !== -1)
          .sort((a, b) => a.i - b.i);
        const first = candidates[0];
        if (!first) {
          const keep = this.buf.lastIndexOf("<");
          this.buf = keep === -1 ? "" : this.buf.slice(keep);
          if (final) this.state = "done";
          return false;
        }
        if (first.next === "code") {
          const m = CODE_OPEN.exec(this.buf)!;
          const attr = /lang\s*=\s*["']?([A-Za-z]+)/.exec(m[1] ?? "");
          const parsed = Language.safeParse(attr?.[1]?.toLowerCase());
          this.lang = parsed.success ? parsed.data : this.fallbackLanguage;
          this.buf = this.buf.slice(m.index + m[0].length);
        } else {
          this.buf = this.buf.slice(first.i + `<${first.next}>`.length);
        }
        this.state = first.next;
        return true;
      }

      case "code": {
        const close = this.buf.indexOf(CODE_CLOSE);
        if (close === -1) {
          if (final) {
            this.out.truncated = true;
            this.state = "done";
          }
          return false;
        }
        const code = stripFences(this.buf.slice(0, close));
        this.buf = this.buf.slice(close + CODE_CLOSE.length);
        this.out.code = { code, language: this.lang };
        events.push({ type: "code", code, language: this.lang });
        this.state = "between";
        return true;
      }

      case "changes": {
        const end = this.sectionEnd("</changes>");
        if (!end && !final) return false;
        const text = end ? this.buf.slice(0, end.index) : this.buf;
        this.buf = end ? this.buf.slice(end.index + end.consume) : "";
        this.out.changes = listItems(text);
        events.push({ type: "changes", items: this.out.changes });
        this.state = "between";
        return true;
      }

      case "effects": {
        const end = this.sectionEnd("</effects>");
        if (!end && !final) return false;
        const text = end ? this.buf.slice(0, end.index) : this.buf;
        this.buf = end ? this.buf.slice(end.index + end.consume) : "";
        this.out.effects = effectNames(text);
        events.push({ type: "effects", names: this.out.effects });
        this.state = "between";
        return true;
      }

      default:
        return false;
    }
  }

  /** A section ends at its closing tag, or (if the model forgot it) where the next section opens. */
  private sectionEnd(closeTag: string): { index: number; consume: number } | null {
    const close = this.buf.indexOf(closeTag);
    if (close !== -1) return { index: close, consume: closeTag.length };
    const next = this.buf.search(/<(effects|changes|code)[\s>]/);
    return next === -1 ? null : { index: next, consume: 0 };
  }

  private emitWhisper(events: ParseEvent[], delta: string) {
    if (!delta) return;
    this.whisper += delta;
    events.push({ type: "whisper", delta });
  }
}
