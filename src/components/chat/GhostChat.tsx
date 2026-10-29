// Vesper chat (refine vs ask) + version history.
// Spec: specs/06 §6.2, §6.7
// Task: T2.5

"use client";

import { useEffect, useRef, useState } from "react";
import { PRESETS } from "@/effects/presets";
import type { AvatarStatus, ChatMessage } from "@/lib/ghost/session";
import type { Version } from "@/types";
import GhostAvatar from "./GhostAvatar";

interface Props {
  messages: ChatMessage[];
  status: AvatarStatus;
  busy: boolean;
  versions: Version[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onSend: (text: string) => void;
  retryable: boolean;
  onRetry: () => void;
  onStop: () => void;
}

const MAX_MESSAGE = 500;

function versionLabel(v: Version): string {
  if (v.id === 0) return "Original";
  return `v${v.id} · ${v.preset ? (PRESETS[v.preset]?.name ?? v.preset) : "possessed"}`;
}

export default function GhostChat({ messages, status, busy, versions, selectedId, onSelect, onSend, retryable, onRetry, onStop }: Props) {
  const [text, setText] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const canChat = versions.length > 1;

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy || !canChat) return;
    onSend(t);
    setText("");
  };

  return (
    <section aria-label="Chat with Vesper" className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center gap-3">
        <GhostAvatar status={status} />
        <div>
          <h2 className="text-lg text-glow">Vesper</h2>
          <p className="text-xs text-ink/70">Ghost designer. Ask for changes, or ask why.</p>
        </div>
      </div>

      <div
        ref={log}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="flex h-64 flex-col gap-2 overflow-y-auto rounded border border-wood-light bg-black/30 p-3 text-sm lg:h-80"
      >
        {messages.length === 0 && <p className="italic text-ink/60">I am waiting in the walls. Paste a component and press Possess.</p>}
        {messages.map((m) => (
          <p
            key={m.id}
            className={`max-w-[90%] rounded px-3 py-2 ${m.role === "user" ? "self-end bg-wood-light" : "self-start bg-wood-dark italic text-spirit"}`}
          >
            {m.text || <span aria-label="Vesper is thinking">…</span>}
          </p>
        ))}
        {retryable && !busy && (
          <button type="button" onClick={onRetry} className="self-start rounded border border-glow px-3 py-1 text-sm text-glow hover:bg-glow hover:text-room">
            Try again
          </button>
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <label className="sr-only" htmlFor="chat-input">
          Message to Vesper
        </label>
        <input
          id="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_MESSAGE}
          disabled={!canChat}
          placeholder={canChat ? "less scary, keep my brand blue…" : "Possess something first"}
          className="min-w-0 flex-1 rounded border border-wood-light bg-wood-dark px-3 py-2 text-sm disabled:opacity-50"
        />
        {busy ? (
          <button type="button" onClick={onStop} className="rounded border border-wood-light px-3 py-2 text-sm hover:border-glow">
            Stop
          </button>
        ) : (
          <button type="submit" disabled={!canChat || !text.trim()} className="rounded bg-glow px-3 py-2 text-sm text-room disabled:opacity-40">
            Send
          </button>
        )}
      </form>

      {versions.length > 0 && (
        <nav aria-label="Version history" className="flex flex-col gap-1">
          <h3 className="text-sm text-ink/70">Versions</h3>
          <ul className="flex flex-wrap gap-1">
            {versions.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  aria-current={v.id === selectedId ? "true" : undefined}
                  disabled={busy}
                  onClick={() => onSelect(v.id)}
                  className={`rounded px-2 py-1 text-xs ${v.id === selectedId ? "bg-glow text-room" : "border border-wood-light bg-wood-dark hover:border-glow"} disabled:opacity-50`}
                >
                  {versionLabel(v)}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </section>
  );
}
