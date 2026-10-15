import { liveCases } from './evals/cases';

export default {
  description: 'RoleProof versus single-prompt baseline on author-labelled synthetic listings. Paid API calls.',
  prompts: ['{{caseId}}'],
  providers: [
    { id: 'file://evals/promptfoo-provider.ts', label: 'Single-prompt baseline', config: { kind: 'baseline' } },
    { id: 'file://evals/promptfoo-provider.ts', label: 'Instructor and deterministic policy', config: { kind: 'roleproof' } },
  ],
  tests: liveCases.map(c => ({ description: c.description, vars: { caseId: c.id }, assert: [{ type: 'equals', value: JSON.stringify(c.expected) }] })),
};
