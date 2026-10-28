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
}

function counted(inner: ModelProvider): { provider: ModelProvider; calls: () => number; reset: () => void } {
  let n = 0;
  const provider: ModelProvider = {
    get id() {
      return inner.id;
    },
    health: () => inner.health(),
    stream: (input, signal) => {
      n++;
      return inner.stream(input, signal);
    },
  };
  return { provider, calls: () => n, reset: () => (n = 0) };
}

async function main() {
  const intensity = Intensity.parse(args.intensity ?? "haunt");
  const presets = (args.presets ? args.presets.split(",") : Object.keys(PRESETS)).map((p) => PresetId.parse(p));
  const fixtures = POSITIVE.filter((f) => !args.only || f.startsWith(args.only));
  const { provider, calls, reset } = counted(createProvider());
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
      };
      if (out?.type === "code") writeFileSync(path.join(OUT, `${name}-${preset}${ext}`), out.code);
      rows.push(row);
      console.log(`${row.outcome.padEnd(17)} ${file} × ${preset} (${row.calls} call${row.calls === 1 ? "" : "s"}, ${row.ms} ms)`);
    }
  }

  writeSummary(rows, intensity, provider.id);
  const clean = rows.filter((r) => r.outcome === "pass").length;
  console.log(`\n${clean}/${rows.length} passed without retry (${Math.round((clean / rows.length) * 100)}%). Summary written to tasks/notes.md`);
}

function writeSummary(rows: Row[], intensity: string, model: string) {
  const pass = rows.filter((r) => r.outcome === "pass").length;
  const retried = rows.filter((r) => r.outcome === "pass after retry").length;
  const failed = rows.length - pass - retried;
  const avg = Math.round(rows.reduce((s, r) => s + r.ms, 0) / Math.max(rows.length, 1));
  const lines = [
    START,
    `## Eval run · ${new Date().toISOString()}`,
    "",
    `Model ${model} · intensity ${intensity} · ${rows.length} possessions · target ≥ 90% pass without retry`,
    "",
    `**${pass} passed without retry (${Math.round((pass / Math.max(rows.length, 1)) * 100)}%)**, ${retried} after one retry, ${failed} failed. Average latency ${avg} ms. Contrast check: not wired yet (T3.2).`,
    "",
    "| Fixture | Preset | Outcome | Calls | Latency | Effects | Note |",
    "|---|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.fixture} | ${r.preset} | ${r.outcome} | ${r.calls} | ${r.ms} ms | ${r.effects} | ${r.detail.replace(/\|/g, "\\|")} |`),
    END,
  ].join("\n");

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
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
