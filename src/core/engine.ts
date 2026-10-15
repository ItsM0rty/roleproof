import type { Analysis, Citation, Extraction, Finding, Profile, Status } from './schema';

const regions: Record<string, readonly string[]> = {
  eu: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'],
  eea: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO'],
  europe: ['AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT','XK','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','SM','RS','SK','SI','ES','SE','CH','UA','GB','VA'],
  latam: ['AR','BO','BR','CL','CO','CR','CU','DO','EC','SV','GT','HT','HN','MX','NI','PA','PY','PE','UY','VE'],
  'north america': ['US','CA','MX'],
};

export function cite(text: string, quote: string): Citation | null {
  const start = text.indexOf(quote);
  return start < 0 ? null : { quote, start, end: start + quote.length };
}

function references(text: string, facts: { quote: string }[]): { citations: Citation[]; invalid: boolean } {
  const found = facts.map(f => cite(text, f.quote));
  return { citations: found.filter((c): c is Citation => c !== null), invalid: found.some(c => c === null) };
}

export function analyze(text: string, facts: Extraction, profile: Profile): Analysis {
  const warnings: string[] = [];
  const make = (dimension: Finding['dimension'], label: string, status: Status, detail: string, citations: Citation[], active = true): Finding => ({ dimension, label, status, detail, citations, active });
  const locationRefs = references(text, facts.location);
  let location = make('location', 'Hiring location', 'unknown', 'The listing does not establish where applicants may be based.', locationRefs.citations);
  if (locationRefs.invalid) {
    warnings.push('Location extraction contained a quotation absent from the source. Its conclusion was withheld.');
  } else if (facts.location.length) {
    const clauses = facts.location.map(clause => {
      if (clause.rule === 'unclear' || clause.scope === 'unspecified') return 'unknown';
      let includes: boolean | null = null;
      if (clause.scope === 'worldwide') includes = true;
      if (clause.scope === 'locations') {
        const sets = clause.values.map(v => /^[A-Z]{2}$/.test(v) ? [v] : regions[v.toLowerCase()]);
        includes = sets.length && sets.every(Boolean) ? sets.some(set => set.includes(profile.country)) : null;
      }
      if (includes === null) return 'unknown';
      return clause.rule === 'allowed' ? (includes ? 'supported' : 'contradicted') : (includes ? 'contradicted' : 'unknown');
    });
    const hasYes = clauses.includes('supported');
    const hasNo = clauses.includes('contradicted');
    const uncertain = clauses.includes('unknown');
    if (hasYes && hasNo) location = make('location', 'Hiring location', 'unknown', 'The listing contains conflicting location clauses. Confirm the hiring scope with the employer.', locationRefs.citations);
    else if (uncertain) location = make('location', 'Hiring location', 'unknown', 'At least one location clause is ambiguous or uses a region this demo cannot resolve. Confirm the hiring scope.', locationRefs.citations);
    else if (hasNo) location = make('location', 'Hiring location', 'contradicted', `The stated hiring locations exclude ${profile.country}. This describes the listing, not a legal eligibility determination.`, locationRefs.citations);
    else if (hasYes) location = make('location', 'Hiring location', 'supported', `The stated hiring scope includes ${profile.country}. Work authorization and employer arrangements still require confirmation.`, locationRefs.citations);
  }

  const salaryRefs = references(text, facts.compensation);
  let salary = make('compensation', 'Annual base salary', 'unknown', 'No explicit annual or monthly base salary can be compared with your preference.', salaryRefs.citations, profile.minimumSalary > 0);
  if (!salary.active) salary.detail = 'No minimum salary preference set.';
  else if (salaryRefs.invalid) warnings.push('Compensation extraction contained a quotation absent from the source. Its conclusion was withheld.');
  else if (facts.compensation.length > 1) salary.detail = 'Multiple compensation ranges are present. Confirm which range applies to your location and level.';
  else if (facts.compensation.length === 1) {
    const range = facts.compensation[0];
    if (range.maximum < range.minimum) salary.detail = 'The extracted salary range is inverted and cannot be compared.';
    else if (range.currency === 'UNKNOWN') salary.detail = 'The listing does not identify a currency unambiguously. A dollar sign alone does not establish which currency applies.';
    else if (range.currency !== profile.currency) salary.detail = `The listing uses ${range.currency}; your preference uses ${profile.currency}. No exchange-rate assumption was made.`;
    else if (range.kind !== 'base') salary.detail = 'The figure is total compensation or does not explicitly identify base pay. Confirm the cash component.';
    else if (range.period === 'hour' || range.period === 'unspecified') salary.detail = 'The pay period cannot be converted to annual cash without additional assumptions.';
    else {
      const factor = range.period === 'month' ? 12 : 1;
      const minimum = range.minimum * factor;
      const maximum = range.maximum * factor;
      const normalized = `${profile.currency} ${minimum.toLocaleString('en-US')} to ${maximum.toLocaleString('en-US')} per year`;
      if (maximum < profile.minimumSalary) salary = make('compensation', salary.label, 'contradicted', `${normalized} is below your minimum of ${profile.currency} ${profile.minimumSalary.toLocaleString('en-US')}.`, salaryRefs.citations);
      else if (minimum >= profile.minimumSalary) salary = make('compensation', salary.label, 'supported', `${normalized} meets your stated minimum across the advertised range.${factor === 12 ? ' Monthly base pay multiplied by 12; bonuses excluded.' : ''}`, salaryRefs.citations);
      else salary.detail = `${normalized} overlaps your minimum, but the lower end falls below it. Confirm the available offer range.`;
    }
  }

  const skillRefs = references(text, facts.skills);
  const normalize = (name: string) => name.toLowerCase().trim().replace(/^react\.js$/, 'react').replace(/^node\.js$/, 'nodejs');
  const mentioned = new Set(facts.skills.map(s => normalize(s.name)));
  const absent = profile.skills.filter(s => !mentioned.has(normalize(s)));
  const skills = make('skills', 'Preferred technologies', profile.skills.length && !absent.length && !skillRefs.invalid ? 'supported' : 'unknown',
    !profile.skills.length ? 'No technology preference set.' : skillRefs.invalid ? 'Some technology evidence could not be found in the source.' : absent.length ? `Not established in the listing: ${absent.join(', ')}. Missing mentions do not establish a mismatch.` : `The listing mentions ${profile.skills.join(', ')}. This does not establish experience level or candidate qualification.`,
    skillRefs.citations, profile.skills.length > 0);
  if (skillRefs.invalid) warnings.push('Technology extraction contained a quotation absent from the source. Its conclusion was withheld.');
  const findings = [location, salary, skills];
  const active = findings.filter(f => f.active);
  return {
    verdict: active.some(f => f.status === 'contradicted') ? 'Potential mismatch' : active.some(f => f.status === 'unknown') ? 'Needs clarification' : 'Preferences supported',
    findings,
    warnings,
  };
}
