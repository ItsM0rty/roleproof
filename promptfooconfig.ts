import { cases } from './evals/cases';

export default {
  description: 'RoleProof synthetic policy replay. No LLM accuracy claim.',
  prompts: ['{{caseId}}'],
  providers: [{ id: 'file://evals/promptfoo-provider.ts', config: { kind: 'replay' } }],
  tests: cases.map(c => ({ description: c.description, vars: { caseId: c.id }, assert: [{ type: 'equals', value: JSON.stringify(c.expected) }] })),
};
