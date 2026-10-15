import { mkdir, writeFile } from 'node:fs/promises';
import { liveCases } from '../evals/cases';
import { runDecision, type DecisionRun } from '../evals/live';
import type { Status } from '../src/core/schema';

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is required. No requests were made. Copy .env.example to .env and configure a key.');
  process.exit(1);
}
const model = process.env.ROLEPROOF_MODEL ?? 'gpt-4o-mini';
const limit = Number(process.env.EVAL_LIMIT ?? liveCases.length);
if (!Number.isInteger(limit) || limit < 1 || limit > liveCases.length) throw new Error(`EVAL_LIMIT must be 1 to ${liveCases.length}.`);
const selected = liveCases.slice(0, limit);
type Row = { id: string; kind: string; error: boolean; expected?: Status[]; correct?: number; falseExclusions?: number; unsupportedConfirmations?: number } & Partial<DecisionRun>;
const rows: Row[] = [];
let errors = 0;
console.log(`Comparing two approaches on ${selected.length} synthetic cases with ${model}. This makes paid model requests.`);
for (const example of selected) for (const kind of ['baseline', 'roleproof'] as const) {
  try {
    const result = await runDecision(kind, example.text, example.profile, { apiKey: process.env.OPENAI_API_KEY, model });
    const correct = result.statuses.filter((s, i) => s === example.expected[i]).length;
    const falseExclusions = result.statuses.filter((s, i) => s === 'contradicted' && example.expected[i] !== 'contradicted').length;
    const unsupportedConfirmations = result.statuses.filter((s, i) => s === 'supported' && example.expected[i] !== 'supported').length;
    rows.push({ id: example.id, kind, expected: example.expected, ...result, correct, falseExclusions, unsupportedConfirmations, error: false });
    console.log(`${example.id} / ${kind}: ${correct}/3 dimensions`);
  } catch {
    errors++;
    rows.push({ id: example.id, kind, error: true });
    console.error(`${example.id} / ${kind}: provider or schema failure; no conclusion scored. Inspect credentials/model access and retry. Provider details are not logged.`);
  }
}
const inputRate = process.env.INPUT_USD_PER_MILLION ? Number(process.env.INPUT_USD_PER_MILLION) : null;
const outputRate = process.env.OUTPUT_USD_PER_MILLION ? Number(process.env.OUTPUT_USD_PER_MILLION) : null;
const summary = ['baseline', 'roleproof'].map(kind => {
  const successful = rows.filter(r => r.kind === kind && !r.error && 'correct' in r);
  const inputTokens = successful.reduce((sum, r) => sum + (r.inputTokens ?? 0), 0);
  const outputTokens = successful.reduce((sum, r) => sum + (r.outputTokens ?? 0), 0);
  const latencies = successful.map(r => r.durationMs ?? 0).sort((a,b) => a-b);
  return {
    kind, successfulCases: successful.length, attemptedCases: selected.length,
    correctDimensions: successful.reduce((sum, r) => sum + (r.correct ?? 0), 0), totalAttemptedDimensions: selected.length * 3,
    falseExclusions: successful.reduce((sum, r) => sum + (r.falseExclusions ?? 0), 0),
    unsupportedConfirmations: successful.reduce((sum, r) => sum + (r.unsupportedConfirmations ?? 0), 0),
    inputTokens, outputTokens, p50Ms: latencies[Math.floor(latencies.length * .5)] ?? null,
    p95Ms: latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * .95) - 1)] ?? null,
    estimatedUSD: inputRate !== null && outputRate !== null && Number.isFinite(inputRate + outputRate) && inputRate >= 0 && outputRate >= 0 ? (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000 : null,
  };
});
await mkdir('evals/results', { recursive: true });
const file = `evals/results/live-${new Date().toISOString().replaceAll(':','-')}.json`;
await writeFile(file, JSON.stringify({ created: new Date().toISOString(), model, dataset: 'synthetic-v1', caveat: 'Small author-labelled synthetic set, not held-out or representative of Matcha. Failed calls may incur unreported tokens. No measured product lift is implied.', rates: { inputUSDPerMillion: inputRate, outputUSDPerMillion: outputRate }, summary, rows }, null, 2));
console.table(summary);
console.log(`Report: ${file}. Costs require explicitly supplied current token rates; failures may incur additional cost.`);
process.exitCode = errors ? 1 : 0;
