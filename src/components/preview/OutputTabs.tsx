// Code / Effects CSS / Changes / Diff tabs with copy + download.
// Spec: specs/01 AC-3.5–3.6
// Task: T2.4

"use client";

import { diffLines } from "diff";
import { useEffect, useMemo, useState } from "react";
import { PRESETS } from "@/effects/presets";
import { effectsCssTab } from "@/effects/extract";
import type { Version } from "@/types";

interface Props {
  /** The version being shown; null before the first possession. */
  version: Version | null;
  original: string;
}

const TABS = ["Code", "Effects CSS", "Changes", "Diff"] as const;
type Tab = (typeof TABS)[number];
const EXTENSION = { html: "html", jsx: "jsx", tsx: "tsx" } as const;

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OutputTabs({ version, original }: Props) {
  const [tab, setTab] = useState<Tab>("Code");
  const [css, setCss] = useState<string | null>(null);
  const [cssError, setCssError] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // The effects stylesheet is served from /vendor (copied at postinstall); fetch it once.
  useEffect(() => {
    let cancelled = false;
    fetch("/vendor/effects.css")
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => !cancelled && setCss(text))
      .catch(() => !cancelled && setCssError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const preset = version?.preset ? (PRESETS[version.preset] ?? null) : null;
  const effectsText = useMemo(() => (css && version ? effectsCssTab(css, version.effects, preset) : ""), [css, version, preset]);
  const parts = useMemo(() => (version ? diffLines(original, version.code) : []), [original, version]);

  if (!version) {
    return <p className="rounded border border-wood-light p-4 text-sm italic text-ink/70">Possess a component and its code, effects and changes appear here.</p>;
  }

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1500);
    } catch {
      setCopied(null);
    }
  };

  const ext = EXTENSION[version.language];
  const active = tab === "Code" ? { label: "code", text: version.code, file: `possessed.${ext}`, type: "text/plain" } : tab === "Effects CSS" ? { label: "CSS", text: effectsText, file: "possessed-effects.css", type: "text/css" } : null;

  return (
    <section aria-label="Possessed output" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Output" className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              id={`tab-${t}`}
              aria-selected={tab === t}
              aria-controls="output-panel"
              type="button"
              onClick={() => setTab(t)}
              className={`rounded px-3 py-1 text-sm ${tab === t ? "bg-glow text-room" : "bg-wood-dark hover:bg-wood-light"}`}
            >
              {t}
            </button>
          ))}
        </div>
        {active && (
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              disabled={!active.text}
              onClick={() => copy(active.label, active.text)}
              className="rounded border border-wood-light px-3 py-1 text-sm hover:border-glow disabled:opacity-40"
            >
              {copied === active.label ? "Copied" : `Copy ${active.label}`}
            </button>
            <button
              type="button"
              disabled={!active.text}
              onClick={() => download(active.file, active.text, active.type)}
              className="rounded border border-wood-light px-3 py-1 text-sm hover:border-glow disabled:opacity-40"
            >
              Download
            </button>
          </div>
        )}
      </div>

      <div id="output-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="max-h-96 overflow-auto rounded border border-wood-light bg-black/40 p-3 text-xs">
        {tab === "Code" && <pre className="whitespace-pre-wrap font-mono">{version.code}</pre>}
        {tab === "Effects CSS" &&
          (cssError ? (
            <p className="italic">The effects library could not be loaded. Reload the page.</p>
          ) : effectsText ? (
            <pre className="whitespace-pre-wrap font-mono">{effectsText}</pre>
          ) : (
            <p className="italic text-ink/70">{css ? "No ghost effects were used in this version." : "Loading…"}</p>
          ))}
        {tab === "Changes" &&
          (version.changes.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {version.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="italic text-ink/70">The ghost listed no changes.</p>
          ))}
        {tab === "Diff" && (
          <pre className="font-mono" aria-label="Diff against the original">
            {parts.map((p, i) => (
              <span
                key={i}
                className={`block whitespace-pre-wrap ${p.added ? "bg-emerald-900/50 text-emerald-200" : p.removed ? "bg-red-900/50 text-red-200" : "text-ink/60"}`}
              >
                {p.value
                  .replace(/\n$/, "")
                  .split("\n")
                  .map((line) => `${p.added ? "+" : p.removed ? "-" : " "} ${line}`)
                  .join("\n")}
              </span>
            ))}
          </pre>
        )}
      </div>
    </section>
  );
}
