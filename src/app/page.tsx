// The haunted studio: editor | before/after preview | ghost chat. Spec: specs/01, specs/05 §5.4 · Tasks: T2.2–T2.6

"use client";

import { useState } from "react";
import CodeEditor from "@/components/editor/CodeEditor";
import type { Language } from "@/types";

export default function HauntedStudio() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language | null>(null);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <header className="text-center">
        <h1 className="text-5xl tracking-[0.25em] text-glow">POSSESSED</h1>
        <p className="mt-2 text-ink/80">Paste one component. A ghost designer will haunt it.</p>
      </header>
      <CodeEditor value={code} onChange={setCode} language={language} onLanguageChange={setLanguage} />
    </main>
  );
}
