// The haunted studio: editor | before/after preview | ghost chat. Wires the session state to the API.
// Spec: specs/01, specs/05 §5.4, specs/06 §6.7
// Tasks: T2.2–T2.6

"use client";

import { useCallback, useDeferredValue, useEffect, useReducer, useRef, useState } from "react";
import GhostChat from "@/components/chat/GhostChat";
import CodeEditor from "@/components/editor/CodeEditor";
import PresetPicker from "@/components/editor/PresetPicker";
import BeforeAfter from "@/components/preview/BeforeAfter";
import OutputTabs from "@/components/preview/OutputTabs";
import { streamGhost } from "@/lib/ghost/client";
import { chooseMode, historyOf, initialSession, reducer, selectedVersion } from "@/lib/ghost/session";
import { analyze } from "@/lib/limits/analyze";
import { Intensity, PossessRequest, PresetId, type Language } from "@/types";

export default function Studio() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language | null>(null);
  const [preset, setPreset] = useState<PresetId>(PresetId.options[0]);
  const [intensity, setIntensity] = useState<Intensity>("haunt");
  const [possessWords, setPossessWords] = useState(false);
  const [session, dispatch] = useReducer(reducer, initialSession);
  const [notices, setNotices] = useState<string[]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const abort = useRef<AbortController | null>(null);

  const analysis = analyze(code, language);
  // The Before preview follows typing, but not on every keystroke.
  const deferredCode = useDeferredValue(code);
  const live = analyze(deferredCode, language);

  const current = selectedVersion(session);
  const original = session.versions[0] ?? null;
  const before = original
    ? { code: original.code, language: original.language }
    : live.canPossess && live.language !== "unknown"
      ? { code: deferredCode, language: live.language }
      : null;
  const after = current && current.id !== 0 ? { code: current.code, language: current.language } : null;

  const addNotice = useCallback((n: string) => setNotices((prev) => (prev.includes(n) ? prev : [...prev, n])), []);

  const run = useCallback(async (req: PossessRequest) => {
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    for await (const event of streamGhost(req, ac.signal)) dispatch({ type: "event", event });
    if (ac.signal.aborted) dispatch({ type: "stopped" });
  }, []);

  // A refusal is a mood, not a state to stay in.
  useEffect(() => {
    if (session.status !== "refusing") return;
    const t = setTimeout(() => dispatch({ type: "calm" }), 2500);
    return () => clearTimeout(t);
  }, [session.status]);

  useEffect(() => () => abort.current?.abort(), []);

  const possess = () => {
    if (!analysis.canPossess || analysis.language === "unknown" || session.busy) return;
    const request = PossessRequest.parse({ mode: "possess", code, language: analysis.language, preset, intensity, possessWords });
    setNotices([]);
    dispatch({ type: "start_possess", request });
    void run(request);
  };

  const send = (text: string) => {
    if (!current || session.busy) return;
    const request = PossessRequest.parse({
      mode: chooseMode(text),
      code: current.code,
      language: current.language,
      preset: current.preset ?? preset,
      intensity,
      possessWords,
      message: text,
      history: historyOf(session.messages),
    });
    dispatch({ type: "start_chat", request, userText: text });
    void run(request);
  };

  const retry = () => {
    if (!session.lastRequest || session.busy) return;
    dispatch({ type: "retry" });
    void run(session.lastRequest);
  };

  const stop = () => abort.current?.abort();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-4 py-6 text-center">
        <h1 className="text-4xl tracking-[0.25em] text-glow sm:text-5xl">POSSESSED</h1>
        <p className="mt-2 text-ink/80">Paste one component. A ghost designer will haunt it.</p>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-6 px-4 pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,0.85fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <CodeEditor value={code} onChange={setCode} language={language} onLanguageChange={setLanguage} />
          <PresetPicker
            preset={preset}
            onPresetChange={setPreset}
            intensity={intensity}
            onIntensityChange={setIntensity}
            possessWords={possessWords}
            onPossessWordsChange={setPossessWords}
            disabled={session.busy}
          />
          <button
            type="button"
            onClick={possess}
            disabled={!analysis.canPossess || session.busy}
            className="rounded bg-glow px-6 py-3 text-lg font-semibold tracking-widest text-room shadow-[0_0_18px_var(--glow)] transition-opacity disabled:opacity-40 disabled:shadow-none"
          >
            {session.busy ? "Possessing…" : "Possess"}
          </button>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <BeforeAfter before={before} after={after} onNotice={addNotice} />
          {notices.length > 0 && (
            <ul aria-label="Preview notices" className="space-y-1 text-xs italic text-ink/70">
              {notices.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          <OutputTabs version={current && current.id !== 0 ? current : null} original={original?.code ?? code} />
        </div>

        <aside className="flex min-w-0 flex-col gap-2">
          <button
            type="button"
            aria-expanded={chatOpen}
            onClick={() => setChatOpen((o) => !o)}
            className="self-start rounded border border-wood-light px-3 py-1 text-sm lg:hidden"
          >
            {chatOpen ? "Hide Vesper" : "Talk to Vesper"}
          </button>
          <div className={chatOpen ? "block" : "hidden lg:block"}>
            <GhostChat
              messages={session.messages}
              status={session.status}
              busy={session.busy}
              versions={session.versions}
              selectedId={session.selectedId}
              onSelect={(id) => dispatch({ type: "select", id })}
              onSend={send}
              retryable={session.retryable}
              onRetry={retry}
              onStop={stop}
            />
          </div>
        </aside>
      </main>

      <footer className="border-t border-wood-light px-4 py-4 text-center text-xs text-ink/70">
        Possessed by Gemma 4 (open weights) · hosted on DigitalOcean · your code is never stored.
      </footer>
    </div>
  );
}
