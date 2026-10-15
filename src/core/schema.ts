import { z } from 'zod';

const evidence = z.string().min(1).max(1500).describe('A short, exact, contiguous quotation from the job description. Never paraphrase.');
export const extractionSchema = z.object({
  location: z.array(z.object({
    scope: z.enum(['worldwide', 'locations', 'unspecified']),
    values: z.array(z.string()).describe('ISO 3166-1 alpha-2 country codes, or region names: Europe, EU, EEA, LATAM, North America, Asia, Africa, Oceania. Empty for worldwide or unspecified.'),
    rule: z.enum(['allowed', 'excluded', 'unclear']),
    quote: evidence,
  })).max(12),
  compensation: z.array(z.object({
    minimum: z.number().nonnegative(),
    maximum: z.number().nonnegative(),
    currency: z.string().describe('Explicit ISO currency code, or UNKNOWN. A bare dollar sign does not establish USD.'),
    period: z.enum(['year', 'month', 'hour', 'unspecified']),
    kind: z.enum(['base', 'total', 'unspecified']),
    quote: evidence,
  })).max(8),
  skills: z.array(z.object({ name: z.string().min(1).max(100), quote: evidence })).max(50),
});

export const profileSchema = z.object({
  country: z.string().regex(/^[A-Z]{2}$/),
  minimumSalary: z.number().min(0).max(10_000_000),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']),
  skills: z.array(z.string().trim().min(1).max(60)).max(12),
});

export type Extraction = z.infer<typeof extractionSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Status = 'supported' | 'contradicted' | 'unknown';
export type Citation = { quote: string; start: number; end: number };
export type Finding = {
  dimension: 'location' | 'compensation' | 'skills';
  label: string;
  status: Status;
  detail: string;
  citations: Citation[];
  active: boolean;
};
export type Analysis = {
  verdict: 'Preferences supported' | 'Needs clarification' | 'Potential mismatch';
  findings: Finding[];
  warnings: string[];
};
