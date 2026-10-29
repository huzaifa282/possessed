// CodeMirror editor, language badge + override, size meter, samples, instant refusal.
// Spec: specs/01 US-1, US-2
// Task: T2.2

"use client";

import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo, useState } from "react";
import { analyze, type MeterLevel } from "@/lib/limits/analyze";
import { REFUSAL_MESSAGES } from "@/lib/limits/gate";
import { SAMPLES } from "@/lib/samples";
import { LIMITS, Language } from "@/types";

interface Props {
  value: string;
  onChange: (code: string) => void;
  /** null = auto-detect. */
  language: Language | null;
  onLanguageChange: (language: Language | null) => void;
}

const METER_COLOUR: Record<MeterLevel, string> = { ok: "bg-spirit", warn: "bg-glow", over: "bg-red-600" };
const LANGUAGES = Language.options;

export default function CodeEditor({ value, onChange, language, onLanguageChange }: Props) {
  const a = useMemo(() => analyze(value, language), [value, language]);
  // Pick one refusal wording per mount so the message doesn't flicker on every keystroke.
  const [variant] = useState(() => Math.floor(Math.random() * 3));

  const extensions = useMemo(
    () => (a.language === "html" ? [html()] : [javascript({ jsx: true, typescript: a.language === "tsx" })]),
    [a.language],
  );

  // An empty box is just a prompt, not a refusal.
  const refusal = !a.gate.ok && value.trim().length > 0 && a.gate.reason !== "empty" ? REFUSAL_MESSAGES[a.gate.reason][variant] : null;
  const needsLanguage = a.gate.ok && a.language === "unknown";
  const { lines, chars } = a.gate.stats;

  return (
    <section aria-label="Component editor" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink/70">Samples:</span>
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              onChange(s.code);
              onLanguageChange(null);
            }}
            className="rounded border border-wood-light bg-wood-dark px-3 py-1 text-sm hover:border-glow hover:text-glow"
          >
            {s.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="rounded bg-wood-light px-2 py-0.5 font-mono text-xs uppercase" data-testid="language-badge">
            {a.language === "unknown" ? "?" : a.language}
            {language === null && a.language !== "unknown" ? " · auto" : ""}
          </span>
          <span className="sr-only">Language</span>
          <select
            value={language ?? ""}
            onChange={(e) => onLanguageChange(e.target.value ? Language.parse(e.target.value) : null)}
            className="rounded border border-wood-light bg-wood-dark px-2 py-1 text-sm"
          >
            <option value="">Auto-detect</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded border border-wood-light">
        <CodeMirror
          value={value}
          onChange={onChange}
          extensions={extensions}
          theme="dark"
          height="360px"
          placeholder="Paste one component here…"
          basicSetup={{ foldGutter: false }}
          aria-label="Component code"
        />
      </div>

      <div className="flex flex-col gap-1" aria-live="polite">
        <div
          role="meter"
          aria-label="Size"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.round(a.usage * 100))}
          className="h-2 overflow-hidden rounded bg-wood-dark"
        >
          <div className={`h-full ${METER_COLOUR[a.level]}`} style={{ width: `${Math.min(100, a.usage * 100)}%` }} />
        </div>
        <p className={`text-xs ${a.level === "over" ? "text-red-400" : "text-ink/70"}`}>
          {lines} / {LIMITS.maxLines} lines · {chars.toLocaleString("en-US")} / {LIMITS.maxChars.toLocaleString("en-US")} characters
        </p>
        {refusal && (
          <p role="alert" className="text-sm italic text-glow">
            {refusal}
          </p>
        )}
        {needsLanguage && <p className="text-sm italic text-glow">I cannot tell what tongue this is. Choose a language above.</p>}
      </div>
    </section>
  );
}
