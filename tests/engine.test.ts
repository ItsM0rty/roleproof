import { describe, expect, it } from 'vitest';
import { analyze, cite } from '../src/core/engine';
import { cases } from '../evals/cases';
import { samples, publicSample, defaultProfile } from '../src/data/samples';

describe('labelled decision policy', () => {
  for (const example of cases) it(example.description, () => {
    const result = analyze(example.text, example.facts, example.profile);
    expect(result.findings.map(f => f.status)).toEqual(example.expected);
    for (const finding of result.findings) for (const ref of finding.citations) {
      expect(example.text.slice(ref.start, ref.end)).toBe(ref.quote);
    }
  });
});

describe('source references and preference changes', () => {
  it('keeps ambiguity in the dated public Matcha excerpt visible without claiming a defect', () => {
    const result = analyze(publicSample.text, publicSample.facts, defaultProfile);
    expect(result.findings.map(f => f.status)).toEqual(['unknown','unknown','supported']);
    expect(result.warnings).toEqual([]);
    for (const finding of result.findings) for (const ref of finding.citations) expect(publicSample.text.slice(ref.start, ref.end)).toBe(ref.quote);
  });
  it('uses JavaScript string offsets consistently for Unicode highlighting', () => {
    const text = 'Résumé: 日本語. Annual salary: USD 90,000.';
    const result = cite(text, 'Annual salary: USD 90,000.');
    expect(result).not.toBeNull();
    expect(text.slice(result!.start, result!.end)).toBe(result!.quote);
    expect(cite(text, 'USD 100,000')).toBeNull();
  });
  it('changes the conclusion using the same extracted facts when country changes', () => {
    const role = samples[2];
    expect(analyze(role.text, role.facts, defaultProfile).verdict).toBe('Potential mismatch');
    expect(analyze(role.text, role.facts, { ...defaultProfile, country: 'US' }).verdict).toBe('Preferences supported');
  });
  it('does not call an omitted preference a reason to withhold a match', () => {
    const role = samples[1];
    const result = analyze(role.text, { ...role.facts, compensation: [], skills: [] }, { ...defaultProfile, minimumSalary: 0, skills: [] });
    expect(result.verdict).toBe('Preferences supported');
    expect(result.findings.filter(f => f.active)).toHaveLength(1);
  });
  it('withholds an inverted compensation range', () => {
    const role = samples[1];
    const facts = structuredClone(role.facts);
    facts.compensation[0].minimum = 200000;
    expect(analyze(role.text, facts, defaultProfile).findings[1].status).toBe('unknown');
  });
});
