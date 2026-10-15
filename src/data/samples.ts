import type { Extraction, Profile } from '../core/schema';

export type Sample = { id: string; company: string; title: string; subtitle: string; text: string; facts: Extraction; source?: { url: string; retrieved: string } };
export const defaultProfile: Profile = { country: 'NP', minimumSalary: 60000, currency: 'USD', skills: ['React', 'TypeScript'] };

export const samples: Sample[] = [
  {
    id: 'conflicting-location', company: 'Northstar', title: 'Product Engineer', subtitle: 'Conflicting location wording',
    text: 'Northstar\nProduct Engineer\n\nLocation: Remote. Hiring in the US, Canada, and Europe only.\n\nBuild thoughtful tools for small teams. You will own features from the first sketch to production, using React and TypeScript.\n\nAnnual base salary: USD 90,000 to 130,000, plus equity.\n\nWe are an async team. Work from anywhere in the world, on a schedule that works for you.\n\nWe value shipped work, clear communication, and attention to the details that make a product feel right.',
    facts: {
      location: [
        { scope: 'locations', values: ['US', 'CA', 'Europe'], rule: 'allowed', quote: 'Hiring in the US, Canada, and Europe only.' },
        { scope: 'worldwide', values: [], rule: 'allowed', quote: 'Work from anywhere in the world, on a schedule that works for you.' },
      ],
      compensation: [{ minimum: 90000, maximum: 130000, currency: 'USD', period: 'year', kind: 'base', quote: 'Annual base salary: USD 90,000 to 130,000, plus equity.' }],
      skills: [{ name: 'React', quote: 'using React and TypeScript.' }, { name: 'TypeScript', quote: 'using React and TypeScript.' }],
    },
  },
  {
    id: 'worldwide', company: 'Fieldwork', title: 'Full-stack Engineer', subtitle: 'Clear worldwide scope',
    text: 'Fieldwork\nFull-stack Engineer\n\nThis role is open to applicants based in any country worldwide.\n\nBuild collaboration software with React, TypeScript, and Postgres. You will pair with design, talk with customers, and own what you ship.\n\nAnnual base salary: USD 80,000 to 110,000. Equity is additional.\n\nOur team is remote and async. We ask for two hours of overlap with 09:00 to 17:00 UTC.\n\nWork authorization and contracting arrangements are confirmed during hiring.',
    facts: {
      location: [{ scope: 'worldwide', values: [], rule: 'allowed', quote: 'This role is open to applicants based in any country worldwide.' }],
      compensation: [{ minimum: 80000, maximum: 110000, currency: 'USD', period: 'year', kind: 'base', quote: 'Annual base salary: USD 80,000 to 110,000.' }],
      skills: [{ name: 'React', quote: 'React, TypeScript, and Postgres.' }, { name: 'TypeScript', quote: 'React, TypeScript, and Postgres.' }, { name: 'Postgres', quote: 'React, TypeScript, and Postgres.' }],
    },
  },
  {
    id: 'us-only', company: 'Meridian', title: 'Frontend Engineer', subtitle: 'An explicit location restriction',
    text: 'Meridian\nFrontend Engineer\n\nRemote within the United States only. Applicants must reside in the United States.\n\nBuild accessible interfaces with React and TypeScript.\n\nAnnual base salary: USD 100,000 to 140,000.\n\nThis is a full-time role with benefits. We do not offer visa sponsorship.',
    facts: {
      location: [{ scope: 'locations', values: ['US'], rule: 'allowed', quote: 'Remote within the United States only.' }],
      compensation: [{ minimum: 100000, maximum: 140000, currency: 'USD', period: 'year', kind: 'base', quote: 'Annual base salary: USD 100,000 to 140,000.' }],
      skills: [{ name: 'React', quote: 'React and TypeScript.' }, { name: 'TypeScript', quote: 'React and TypeScript.' }],
    },
  },
  {
    id: 'uncertain-pay', company: 'Common Ground', title: 'Software Engineer', subtitle: 'Total compensation is not base pay',
    text: 'Common Ground\nSoftware Engineer\n\nApplicants from any country worldwide are welcome.\n\nWork on our TypeScript platform and help small businesses run better.\n\nTotal compensation: USD 100,000 to 160,000 per year, including equity and performance bonus.\n\nWe share the base salary breakdown during the interview process.',
    facts: {
      location: [{ scope: 'worldwide', values: [], rule: 'allowed', quote: 'Applicants from any country worldwide are welcome.' }],
      compensation: [{ minimum: 100000, maximum: 160000, currency: 'USD', period: 'year', kind: 'total', quote: 'Total compensation: USD 100,000 to 160,000 per year, including equity and performance bonus.' }],
      skills: [{ name: 'TypeScript', quote: 'our TypeScript platform' }],
    },
  },
];

export const ambiguousSample: Sample = {
  id: 'ambiguous-hiring', company: 'Waypoint', title: 'Founding Full-stack Engineer', subtitle: 'Unclear hiring arrangements and currency',
  text: 'Waypoint\nFounding Full-stack Engineer\n\nHiring regions: US, Canada, Europe, UK, Brazil, and LATAM.\n\nOur application uses TypeScript and React.\n\nCompensation: $128,000 to $150,000 per year, plus equity.\n\nRemote work is flexible; confirm hiring arrangements with the team.\n\nWe can discuss employment or contracting during interviews.',
  facts: {
    location: [
      { scope: 'locations', values: ['US','CA','Europe','GB','BR','LATAM'], rule: 'allowed', quote: 'Hiring regions: US, Canada, Europe, UK, Brazil, and LATAM.' },
      { scope: 'unspecified', values: [], rule: 'unclear', quote: 'Remote work is flexible; confirm hiring arrangements with the team.' },
    ],
    compensation: [{ minimum: 128000, maximum: 150000, currency: 'UNKNOWN', period: 'year', kind: 'unspecified', quote: 'Compensation: $128,000 to $150,000 per year, plus equity.' }],
    skills: [{ name: 'TypeScript', quote: 'Our application uses TypeScript and React.' }, { name: 'React', quote: 'Our application uses TypeScript and React.' }],
  },
};
export const allSamples = [...samples, ambiguousSample];
