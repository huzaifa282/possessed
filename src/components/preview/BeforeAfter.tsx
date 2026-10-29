// Before/after slider + side-by-side + background toggle.
// Spec: specs/05 §5.4
// Task: T2.4

"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { Language } from "@/types";
import PreviewFrame from "./PreviewFrame";

export interface Side {
  code: string;
  language: Language;
}

interface Props {
  before: Side | null;
  after: Side | null;
  onNotice?: (notice: string) => void;
}

type Mode = "slider" | "side";
type Background = "light" | "dark" | "checker";

const BACKGROUNDS: Record<Background, CSSProperties> = {
  light: { background: "#ffffff" },
  dark: { background: "#111111" },
  checker: {
    backgroundColor: "#ffffff",
    backgroundImage: "conic-gradient(#d4d4d4 25%, transparent 0 50%, #d4d4d4 0 75%, transparent 0)",
    backgroundSize: "20px 20px",
  },
};

const toggle = (active: boolean) =>
  `rounded px-3 py-1 text-sm ${active ? "bg-glow text-room" : "bg-wood-dark hover:bg-wood-light"}`;

export default function BeforeAfter({ before, after, onNotice }: Props) {
  const [mode, setMode] = useState<Mode>("slider");
  const [bg, setBg] = useState<Background>("light");
  const [position, setPosition] = useState(50); // % of the width where "after" starts
  const [narrow, setNarrow] = useState<"before" | "after">("after");
  const stage = useRef<HTMLDivElement>(null);

  const moveTo = (clientX: number) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100)));
  };
  const onPointerDown = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    moveTo(e.clientX);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (e.buttons === 1) moveTo(e.clientX);
  };
  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - step));
    else if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + step));
    else if (e.key === "Home") setPosition(0);
    else if (e.key === "End") setPosition(100);
    else return;
    e.preventDefault();
  };

  const frame = (side: Side | null, title: string) =>
    side ? <PreviewFrame code={side.code} language={side.language} title={title} onNotice={onNotice} /> : null;

  const waiting = (
    <p className="p-6 text-center text-sm italic text-black/60 mix-blend-normal">The ghost has not possessed this yet.</p>
  );

  return (
    <section aria-label="Before and after preview" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="group" aria-label="View">
          <button type="button" aria-pressed={mode === "slider"} onClick={() => setMode("slider")} className={toggle(mode === "slider")}>
            Slider
          </button>
          <button type="button" aria-pressed={mode === "side"} onClick={() => setMode("side")} className={toggle(mode === "side")}>
            Side by side
          </button>
        </div>
        <div className="ml-auto flex gap-1" role="group" aria-label="Preview background">
          {(Object.keys(BACKGROUNDS) as Background[]).map((b) => (
            <button key={b} type="button" aria-pressed={bg === b} onClick={() => setBg(b)} className={`${toggle(bg === b)} capitalize`}>
              {b}
            </button>
          ))}
        </div>
      </div>

      {mode === "slider" ? (
        <div
          ref={stage}
          className="relative grid select-none overflow-hidden rounded border border-wood-light"
          style={BACKGROUNDS[bg]}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
        >
          <div className="pointer-events-none [grid-area:1/1]">{frame(before, "Original component")}</div>
          {after && (
            <div className="pointer-events-none [grid-area:1/1]" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
              <div className="min-h-full" style={BACKGROUNDS[bg]}>
                {frame(after, "Possessed component")}
              </div>
            </div>
          )}
          {!after && <div className="pointer-events-none absolute inset-x-0 bottom-0">{waiting}</div>}
          {after && (
            <div
              role="slider"
              tabIndex={0}
              aria-label="Before and after position"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(position)}
              onKeyDown={onKey}
              className="absolute inset-y-0 z-10 w-1 -translate-x-1/2 cursor-ew-resize bg-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-spirit"
              style={{ left: `${position}%` }}
            >
              <span className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-glow text-xs text-room">
                ⇆
              </span>
            </div>
          )}
          <span className="pointer-events-none absolute top-2 left-2 z-10 rounded bg-black/70 px-2 py-0.5 text-xs text-ink">Before</span>
          {after && <span className="pointer-events-none absolute top-2 right-2 z-10 rounded bg-black/70 px-2 py-0.5 text-xs text-ink">After</span>}
        </div>
      ) : (
        <>
          <div className="flex gap-1 md:hidden" role="group" aria-label="Show">
            {(["before", "after"] as const).map((n) => (
              <button key={n} type="button" aria-pressed={narrow === n} onClick={() => setNarrow(n)} className={`${toggle(narrow === n)} capitalize`}>
                {n}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <figure className={`${narrow === "before" ? "block" : "hidden"} m-0 md:block`}>
              <figcaption className="mb-1 text-xs text-ink/70">Before</figcaption>
              <div className="overflow-hidden rounded border border-wood-light" style={BACKGROUNDS[bg]}>
                {frame(before, "Original component")}
              </div>
            </figure>
            <figure className={`${narrow === "after" ? "block" : "hidden"} m-0 md:block`}>
              <figcaption className="mb-1 text-xs text-ink/70">After</figcaption>
              <div className="overflow-hidden rounded border border-wood-light" style={BACKGROUNDS[bg]}>
                {after ? frame(after, "Possessed component") : waiting}
              </div>
            </figure>
          </div>
        </>
      )}
    </section>
  );
}
