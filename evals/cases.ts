import type { Extraction, Profile, Status } from '../src/core/schema';
import { defaultProfile, samples } from '../src/data/samples';

export type EvalCase = { id: string; description: string; text: string; facts: Extraction; profile: Profile; expected: [Status, Status, Status]; category: string };
const base = samples[1];
function salaryCase(id: string, quote: string, range: Extraction['compensation'][number], expected: Status): EvalCase {
  return { id, description: id.replaceAll('-', ' '), text: base.text + '\n' + quote, facts: { ...base.facts, compensation: [{ ...range, quote }] }, profile: defaultProfile, expected: ['supported', expected, 'supported'], category: 'compensation' };
}
const basePay = { minimum: 80000, maximum: 110000, currency: 'USD', period: 'year' as const, kind: 'base' as const, quote: '' };

export const cases: EvalCase[] = [
  ...samples.map((s, i): EvalCase => ({
    id: s.id, description: s.subtitle, text: s.text, facts: s.facts, profile: defaultProfile,
    expected: ([['unknown','supported','supported'], ['supported','supported','supported'], ['contradicted','supported','supported'], ['supported','unknown','unknown']] as [Status,Status,Status][])[i],
    category: i === 3 ? 'compensation' : 'location',
  })),
  { id: 'remote-unspecified', description: 'Remote alone does not establish worldwide hiring', text: 'Remote role. Build with React and TypeScript.', facts: { location: [{ scope: 'unspecified', values: [], rule: 'unclear', quote: 'Remote role.' }], compensation: [], skills: [{ name: 'React', quote: 'React and TypeScript.' }, { name: 'TypeScript', quote: 'React and TypeScript.' }] }, profile: defaultProfile, expected: ['unknown','unknown','supported'], category: 'location' },
  { id: 'europe-includes-germany', description: 'European hiring scope includes Germany', text: 'Hiring applicants based in Europe only.', facts: { location: [{ scope: 'locations', values: ['Europe'], rule: 'allowed', quote: 'Hiring applicants based in Europe only.' }], compensation: [], skills: [] }, profile: { ...defaultProfile, country: 'DE' }, expected: ['supported','unknown','unknown'], category: 'location' },
  { id: 'eu-excludes-uk', description: 'EU and Europe are different scopes', text: 'Applicants must be based in the EU.', facts: { location: [{ scope: 'locations', values: ['EU'], rule: 'allowed', quote: 'Applicants must be based in the EU.' }], compensation: [], skills: [] }, profile: { ...defaultProfile, country: 'GB' }, expected: ['contradicted','unknown','unknown'], category: 'location' },
  { id: 'unsupported-region', description: 'Unmapped region does not cause automatic rejection', text: 'We hire across APAC.', facts: { location: [{ scope: 'locations', values: ['APAC'], rule: 'allowed', quote: 'We hire across APAC.' }], compensation: [], skills: [] }, profile: defaultProfile, expected: ['unknown','unknown','unknown'], category: 'location' },
  { id: 'exclusion-is-not-inclusion', description: 'Not excluded does not establish an affirmative hiring policy', text: 'We cannot hire residents of the United States.', facts: { location: [{ scope: 'locations', values: ['US'], rule: 'excluded', quote: 'We cannot hire residents of the United States.' }], compensation: [], skills: [] }, profile: defaultProfile, expected: ['unknown','unknown','unknown'], category: 'location' },
  { id: 'explicit-exclusion', description: 'Explicit exclusion produces a mismatch', text: 'We cannot hire residents of Nepal.', facts: { location: [{ scope: 'locations', values: ['NP'], rule: 'excluded', quote: 'We cannot hire residents of Nepal.' }], compensation: [], skills: [] }, profile: defaultProfile, expected: ['contradicted','unknown','unknown'], category: 'location' },
  salaryCase('below-cash-minimum', 'Annual base salary: USD 30,000 to 50,000.', { ...basePay, minimum: 30000, maximum: 50000 }, 'contradicted'),
  salaryCase('overlapping-range', 'Annual base salary: USD 40,000 to 100,000.', { ...basePay, minimum: 40000, maximum: 100000 }, 'unknown'),
  salaryCase('currency-mismatch', 'Annual base salary: EUR 80,000 to 110,000.', { ...basePay, currency: 'EUR' }, 'unknown'),
  salaryCase('ambiguous-dollar-sign', 'Annual base salary: $80,000 to $110,000.', { ...basePay, currency: 'UNKNOWN' }, 'unknown'),
  salaryCase('hourly-without-hours', 'Base pay: USD 80 to 100 per hour.', { ...basePay, minimum: 80, maximum: 100, period: 'hour' }, 'unknown'),
  salaryCase('monthly-base', 'Monthly base salary: USD 5,000 to 7,000.', { ...basePay, minimum: 5000, maximum: 7000, period: 'month' }, 'supported'),
  salaryCase('unspecified-pay-kind', 'Compensation: USD 80,000 to 110,000 per year.', { ...basePay, kind: 'unspecified' }, 'unknown'),
  { id: 'missing-salary', description: 'Salary not disclosed remains unknown', text: base.text.replace(base.facts.compensation[0].quote, ''), facts: { ...base.facts, compensation: [] }, profile: defaultProfile, expected: ['supported','unknown','supported'], category: 'compensation' },
  { id: 'multiple-ranges', description: 'Do not choose a convenient range when several are present', text: base.text + '\nUS annual base: USD 140,000 to 180,000.', facts: { ...base.facts, compensation: [...base.facts.compensation, { ...basePay, minimum: 140000, maximum: 180000, quote: 'US annual base: USD 140,000 to 180,000.' }] }, profile: defaultProfile, expected: ['supported','unknown','supported'], category: 'compensation' },
  { id: 'missing-technology', description: 'Missing Rust mention is unknown rather than contradicted', text: base.text, facts: base.facts, profile: { ...defaultProfile, skills: ['Rust'] }, expected: ['supported','supported','unknown'], category: 'skills' },
  { id: 'fabricated-location-quote', description: 'Unverifiable source evidence cannot support a decision', text: base.text, facts: { ...base.facts, location: [{ scope: 'worldwide', values: [], rule: 'allowed', quote: 'We hire in Nepal.' }] }, profile: defaultProfile, expected: ['unknown','supported','supported'], category: 'evidence' },
  { id: 'fabricated-salary-quote', description: 'A plausible salary with fabricated evidence stays unknown', text: base.text, facts: { ...base.facts, compensation: [{ ...basePay, quote: 'Guaranteed base salary of USD 100,000.' }] }, profile: defaultProfile, expected: ['supported','unknown','supported'], category: 'evidence' },
  { id: 'fabricated-skill-quote', description: 'Invented technology evidence cannot confirm fit', text: base.text, facts: { ...base.facts, skills: [{ name: 'React', quote: 'Our React engineering team.' }, { name: 'TypeScript', quote: 'Our TypeScript engineering team.' }] }, profile: defaultProfile, expected: ['supported','supported','unknown'], category: 'evidence' },
];

export const liveCases = cases.filter(c => c.category !== 'evidence');
