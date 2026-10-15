import { analyze } from '../src/core/engine';
import { cases } from '../evals/cases';

let failures = 0;
const summary = new Map<string, { total: number; passed: number }>();
for (const example of cases) {
  const actual = analyze(example.text, example.facts, example.profile).findings.map(f => f.status);
  const pass = JSON.stringify(actual) === JSON.stringify(example.expected);
  const group = summary.get(example.category) ?? { total: 0, passed: 0 };
  group.total++; group.passed += Number(pass); summary.set(example.category, group);
  if (!pass) { failures++; console.error(`${example.id}: expected ${example.expected.join('/')} but received ${actual.join('/')}`); }
}
console.log('Policy replay on hand-authored synthetic facts. This does not measure LLM extraction accuracy.');
console.table(Object.fromEntries(summary));
console.log(`${cases.length - failures}/${cases.length} scenarios passed. No API calls.`);
process.exitCode = failures ? 1 : 0;
