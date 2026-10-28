"use client";

import { useCallback, useState } from "react";
import PreviewFrame from "@/components/preview/PreviewFrame";
import type { Language } from "@/types";

export interface Sample {
  name: string;
  code: string;
  language: Language;
}

export default function Harness({ samples }: { samples: Sample[] }) {
  const [index, setIndex] = useState(0);
  const [notices, setNotices] = useState<string[]>([]);
  const [pwned, setPwned] = useState(false);
  const sample = samples[index];

  const onNotice = useCallback((n: string) => {
    setNotices((prev) => [...prev, n]);
    setPwned(document.body.hasAttribute("data-pwned") || document.title === "pwned");
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Preview sandbox harness (dev only)</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        {samples.map((s, i) => (
          <button
            key={s.name}
            data-sample={s.name}
            onClick={() => {
              setNotices([]);
              setIndex(i);
            }}
            style={{ fontWeight: i === index ? 700 : 400 }}
          >
            {s.name}
          </button>
        ))}
      </div>
      <p>
        Language: <b data-testid="language">{sample.language}</b> · Parent compromised:{" "}
        <b data-testid="pwned">{pwned ? "YES" : "no"}</b>
      </p>
      <ul data-testid="notices">
        {notices.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
      <div style={{ border: "1px solid #ccc", background: "#fafafa" }}>
        <PreviewFrame key={sample.name} code={sample.code} language={sample.language} onNotice={onNotice} />
      </div>
    </main>
  );
}
