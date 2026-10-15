import { cases } from './cases';
import { analyze } from '../src/core/engine';
import { runDecision } from './live';

export default class RoleProofProvider {
  private kind: 'replay' | 'baseline' | 'roleproof';
  constructor(options: { config?: { kind?: 'replay' | 'baseline' | 'roleproof' } } = {}) { this.kind = options.config?.kind ?? 'replay'; }
  id() { return `roleproof:${this.kind}`; }
  async callApi(prompt: string) {
    const example = cases.find(c => c.id === prompt.trim());
    if (!example) return { error: 'Unknown evaluation case.' };
    if (this.kind === 'replay') return { output: JSON.stringify(analyze(example.text, example.facts, example.profile).findings.map(f => f.status)) };
    if (!process.env.OPENAI_API_KEY) return { error: 'OPENAI_API_KEY is required for live evaluations.' };
    try {
      const run = await runDecision(this.kind, example.text, example.profile, { apiKey: process.env.OPENAI_API_KEY, model: process.env.ROLEPROOF_MODEL ?? 'gpt-4o-mini' });
      return { output: JSON.stringify(run.statuses), tokenUsage: { prompt: run.inputTokens, completion: run.outputTokens, total: run.inputTokens + run.outputTokens }, metadata: { durationMs: run.durationMs, warnings: run.warnings } };
    } catch { return { error: 'Provider or schema failure; no conclusion.' }; }
  }
}
