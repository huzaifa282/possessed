// Sandboxed iframe host + postMessage bridge + watchdog.
// Spec: specs/05 §5.1–5.3
// Task: T1.10

"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { FrameMessage, MAX_FRAME_HEIGHT, MIN_FRAME_HEIGHT, WATCHDOG_MS } from "@/lib/preview/messages";
import { buildSrcdoc, SANDBOX, type SrcdocResult } from "@/lib/preview/srcdoc";
import type { Language } from "@/types";

export interface PreviewFrameProps {
  code: string;
  language: Language;
  title?: string;
  className?: string;
  /** Receives placeholder notices (e.g. stubbed imports) and runtime errors from the frame. */
  onNotice?: (notice: string) => void;
}

type Built = SrcdocResult & { error: string | null };
type Status = "loading" | "ready" | "frozen";

/** Small stable hash so the host remounts (fresh state, fresh iframe) whenever the document changes. */
function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

export default function PreviewFrame(props: PreviewFrameProps) {
  const { code, language } = props;
  // window is not available while server-rendering, so the origin is null until the client takes over.
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => null,
  );
  const [attempt, setAttempt] = useState(0);

  const built = useMemo<Built | null>(() => {
    if (!origin) return null;
    try {
      return { ...buildSrcdoc({ code, language, appOrigin: origin }), error: null };
    } catch (e) {
      return { html: "", notices: [], error: e instanceof Error ? e.message : String(e) };
    }
  }, [code, language, origin]);

  if (!built) return <div className={props.className} />;
  return <Host key={`${attempt}:${hash(built.html || built.error || "")}`} {...props} built={built} onRetry={() => setAttempt((a) => a + 1)} />;
}

function Host({ built, title = "Component preview", className, onNotice, onRetry }: PreviewFrameProps & { built: Built; onRetry: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(MIN_FRAME_HEIGHT);
  const [status, setStatus] = useState<Status>("loading");
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    built.notices.forEach((n) => onNotice?.(n));
    // Once per document: a new callback identity must not re-announce the notices.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const parsed = FrameMessage.safeParse(event.data);
      if (!parsed.success) return;
      const msg = parsed.data;
      if (msg.type === "error") {
        setRuntimeError(msg.message);
        onNotice?.(msg.message);
        return;
      }
      setHeight(Math.min(MAX_FRAME_HEIGHT, Math.max(MIN_FRAME_HEIGHT, msg.height)));
      if (msg.type === "ready") setStatus("ready");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onNotice]);

  // Watchdog: a frame that never reports ready is stuck (e.g. an infinite loop) and is removed.
  useEffect(() => {
    if (status !== "loading" || built.error) return;
    const t = setTimeout(() => setStatus("frozen"), WATCHDOG_MS);
    return () => clearTimeout(t);
  }, [status, built.error]);

  if (built.error) return <div className={className}><p role="alert">{built.error}</p></div>;
  if (status === "frozen") {
    return (
      <div className={className}>
        <p role="status">
          The spirit froze. <button onClick={onRetry}>Try again</button>
        </p>
      </div>
    );
  }
  return (
    <div className={className}>
      <iframe
        ref={frame}
        title={title}
        sandbox={SANDBOX}
        srcDoc={built.html}
        style={{ width: "100%", height, border: 0, background: "transparent" }}
      />
      {runtimeError && <p role="alert">{runtimeError}</p>}
    </div>
  );
}
