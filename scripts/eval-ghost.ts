// npm run eval: possess every positive fixture in each preset, save outputs to tests/eval-out/, append a summary to tasks/notes.md.
// Spec: specs/09 §9.3
// Task: T1.9
// Usage: npm run eval [-- --presets=victorian,terminal --only=pricing-card --intensity=haunt]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PRESETS } from "../src/effects/presets";
import { detect } from "../src/lib/limits/detect";
import { possess } from "../src/lib/ghost/possess";
import { createProvider, type ModelProvider } from "../src/lib/model/provider";
import { Intensity, PossessRequest, PresetId, type GhostEvent } from "../src/types";

const ROOT = path.resolve(__dirname, "..");
const FIXTURES = path.join(ROOT, "tests/fixtures/components");
const OUT = path.join(ROOT, "tests/eval-out");
const NOTES = path.join(ROOT, "tasks/notes.md");
const POSITIVE = ["pricing-card.jsx", "login-form.html", "navbar.tsx", "guideme-sidepanel.html", "profile-card.jsx"];
const START = "<!-- eval:start -->";
const END = "<!-- eval:end -->";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);

interface Row {
  fixture: string;
  preset: string;
  outcome: "pass" | "pass after retry" | "refused" | "error";
  calls: number;
  ms: number;
  effects: string;
  detail: string;
  /** Tokens summed over every call of this possession; null when the backend does not report them. */
  tokens: { prompt: number; output: number } | null;
}

function counted(inner: ModelProvider) {
  let n = 0;
  let usage: { prompt: number; output: number } | null = null;
  const provider: ModelProvider = {
    get id() {
      return inner.id;
    },
    health: () => inner.health(),
    stream: (input, signal) => {
      n++;
      return (async function* () {
        try {
          yield* inner.stream(input, signal);
        } finally {
          const u = inner.lastUsage;
          if (u) usage = { prompt: (usage?.prompt ?? 0) + u.promptTokens, output: (usage?.output ?? 0) + u.outputTokens };
        }
      })();
    },
  };
  return {
    provider,
    calls: () => n,
    tokens: () => usage,
    reset: () => {
      n = 0;
      usage = null;
    },
  };
}

async function main() {
  const intensity = Intensity.parse(args.intensity ?? "haunt");
  const presets = (args.presets ? args.presets.split(",") : Object.keys(PRESETS)).map((p) => PresetId.parse(p));
  const fixtures = POSITIVE.filter((f) => !args.only || f.startsWith(args.only));
  const { provider, calls, tokens, reset } = counted(createProvider());
  mkdirSync(OUT, { recursive: true });

  const rows: Row[] = [];
  for (const file of fixtures) {
    const code = readFileSync(path.join(FIXTURES, file), "utf8");
    const language = detect(code);
    if (language === "unknown") throw new Error(`Cannot detect the language of ${file}`);
    const name = file.replace(/\.[^.]+$/, "");
    const ext = path.extname(file);

    for (const preset of presets) {
      const req = PossessRequest.parse({ mode: "possess", code, language, preset, intensity });
      reset();
      const started = Date.now();
      const events: GhostEvent[] = [];
      for await (const e of possess(req, provider, new AbortController().signal)) events.push(e);

      const out = events.find((e) => e.type === "code");
      const effects = events.find((e) => e.type === "effects");
      const failure = events.find((e) => e.type === "error" || e.type === "refusal");
      const row: Row = {
        fixture: file,
        preset,
        outcome: out ? (calls() > 1 ? "pass after retry" : "pass") : failure?.type === "refusal" ? "refused" : "error",
        calls: calls(),
        ms: Date.now() - started,
        effects: effects?.type === "effects" ? effects.names.join(", ") : "",
        detail: failure && "message" in failure ? failure.message : "",
        tokens: tokens(),
      };
      if (out?.type === "code") writeFileSync(path.join(OUT, `${name}-${preset}${ext}`), out.code);
      rows.push(row);
      console.log(`${row.outcome.padEnd(17)} ${file} × ${preset} (${row.calls} call${row.calls === 1 ? "" : "s"}, ${row.ms} ms)`);
    }
  }

  writeSummary(rows, intensity, provider.id);
  const clean = rows.filter((r) => r.outcome === "pass").length;
  console.log(`\n${clean}/${rows.length} passed without retry (${Math.round((clean / rows.length) * 100)}%). `);
}

function writeSummary(rows: Row[], intensity: string, model: string) {
  const pass = rows.filter((r) => r.outcome === "pass").length;
  const retried = rows.filter((r) => r.outcome === "pass after retry").length;
  const failed = rows.length - pass - retried;
  const avg = Math.round(rows.reduce((s, r) => s + r.ms, 0) / Math.max(rows.length, 1));
  const counted = rows.filter((r) => r.tokens);
  const tokenLine = counted.length
    ? ` Average tokens per possession: ${Math.round(counted.reduce((s, r) => s + r.tokens!.prompt, 0) / counted.length)} in, ${Math.round(counted.reduce((s, r) => s + r.tokens!.output, 0) / counted.length)} out (${counted.length} of ${rows.length} runs reported usage).`
    : "";
  const lines = [
    START,
    `## Eval run · ${new Date().toISOString()}`,
    "",
    `Model ${model} · intensity ${intensity} · ${rows.length} possessions · target ≥ 90% pass without retry`,
    "",
    `**${pass} passed without retry (${Math.round((pass / Math.max(rows.length, 1)) * 100)}%)**, ${retried} after one retry, ${failed} failed. Average latency ${avg} ms.${tokenLine} Contrast check is not part of the eval (it needs a browser; see T3.2).`,
    "",
    "| Fixture | Preset | Outcome | Calls | Latency | Tokens in/out | Effects | Note |",
    "|---|---|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.fixture} | ${r.preset} | ${r.outcome} | ${r.calls} | ${r.ms} ms | ${r.tokens ? `${r.tokens.prompt}/${r.tokens.output}` : "n/a"} | ${r.effects} | ${r.detail.replace(/\|/g, "\\|")} |`),
    END,
  ].join("\n");

  // A filtered run (--only / --presets) must not replace the full-run table in tasks/notes.md.
  if (args.only || args.presets) {
    const partial = path.join(OUT, "summary-partial.md");
    writeFileSync(partial, `${lines}
`);
    console.log(`Filtered run: summary written to ${path.relative(ROOT, partial)}, tasks/notes.md left as it was.`);
    return;
  }

  const existing = (() => {
    try {
      return readFileSync(NOTES, "utf8");
    } catch {
      return "# Notes and eval results\n";
    }
  })();
  const a = existing.indexOf(START);
  const b = existing.indexOf(END);
  const next = a !== -1 && b !== -1 ? existing.slice(0, a) + lines + existing.slice(b + END.length) : `${existing.trimEnd()}\n\n${lines}\n`;
  writeFileSync(NOTES, next);
  console.log("Summary written to tasks/notes.md");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
