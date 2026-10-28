// Orchestration: gate → prompt → stream → parse → validate → one retry → GhostEvents.
// Spec: specs/06-ghost-engine.md
// Task: T1.8 / T2.1
import { getPreset } from "@/effects/presets";
import { gate } from "@/lib/limits/gate";
import { ProviderError, type ModelProvider } from "@/lib/model/provider";
import type { GhostEvent, PossessRequest } from "@/types";
import { GhostParser, type ParsedOutput } from "./parse";
import { buildSystemPrompt, buildUserPrompt, MAX_OUTPUT_TOKENS, TEMPERATURE } from "./prompt";
import { validate } from "./validate";

const APOLOGY = "My form wavers; the spell slipped. Ask me again and I will try once more.";

export async function* possess(req: PossessRequest, provider: ModelProvider, signal: AbortSignal): AsyncGenerator<GhostEvent> {
  const started = Date.now();

  const gated = gate(req.code, req.language);
  if (!gated.ok) {
    yield { type: "refusal", reason: gated.reason, message: gated.message };
    return;
  }

  let preset;
  try {
    preset = getPreset(req.preset);
  } catch (e) {
    yield { type: "error", message: e instanceof Error ? e.message : "Unknown preset", retryable: false };
    return;
  }

  const system = buildSystemPrompt({ req, preset });
  let retryError: string | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const parser = new GhostParser(req.language);
    try {
      const stream = provider.stream(
        { system, user: buildUserPrompt(req, retryError), temperature: TEMPERATURE[req.mode], maxOutputTokens: MAX_OUTPUT_TOKENS },
        signal,
      );
      for await (const chunk of stream) {
        for (const ev of parser.push(chunk)) {
          // The voice streams live; on a retry it has already been shown.
          if (ev.type === "whisper" && attempt === 0) yield ev;
        }
      }
      for (const ev of parser.end()) {
        if (ev.type === "whisper" && attempt === 0) yield ev;
      }
    } catch (e) {
      if (signal.aborted) return;
      if (e instanceof ProviderError) {
        yield { type: "error", message: APOLOGY, retryable: e.retryable };
        return;
      }
      throw e;
    }

    const out = parser.result();
    if (req.mode === "ask") {
      yield { type: "done", ms: Date.now() - started, model: provider.id };
      return;
    }

    const verdict = check(req, out);
    if (verdict.ok) {
      if (verdict.code) {
        yield { type: "code", code: verdict.code.code, language: verdict.code.language };
        yield { type: "changes", items: verdict.changes };
        yield { type: "effects", names: verdict.effects };
      }
      yield { type: "done", ms: Date.now() - started, model: provider.id };
      return;
    }
    retryError = verdict.error;
  }

  yield { type: "error", message: APOLOGY, retryable: true };
}

type Verdict =
  | { ok: true; code: { code: string; language: PossessRequest["language"] } | null; changes: string[]; effects: string[] }
  | { ok: false; error: string };

function check(req: PossessRequest, out: ParsedOutput): Verdict {
  if (!out.code) {
    // A refinement may legitimately change nothing (spec 06 §6.2); a first possession may not.
    if (req.mode === "refine" && !out.truncated) return { ok: true, code: null, changes: [], effects: [] };
    return { ok: false, error: out.truncated ? "Your reply was cut off before </code>." : "You did not return a <code> block." };
  }
  const v = validate({ original: req.code, language: req.language, output: out.code, possessWords: req.possessWords });
  if (!v.ok) return v;
  const changes = v.strippedEffects.length ? [...out.changes, `Removed unknown effect classes: ${v.strippedEffects.join(", ")}`] : out.changes;
  return { ok: true, code: { code: v.code, language: out.code.language }, changes, effects: v.effectsUsed };
}
