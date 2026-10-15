# Evaluation methodology

## What was measured locally

- 23 synthetic, author-labelled policy scenarios.
- 35 tests, including those scenarios, source offsets, preference changes,
  invalid inputs, cache reuse, API failures, request limits, and a real Instructor
  integration using a fake local HTTP provider with an invalid-first-response retry.
- TypeScript checking and the Vite production build.
- The optional Promptfoo 0.124.1 replay: 23 passed, zero failed, zero errors,
  using Node 24.19.0. This replay makes no model requests.
- Manual browser checks for citation highlighting, country and salary changes,
  custom-listing input, and the explicit missing-key state.

The UI includes five fictional listings with hand-authored facts. An additional
regression case checks ambiguous hiring arrangements and currency separately
from the 23-scenario policy evaluation set.

The policy set has nine location cases, ten compensation cases, one additional
technology case, and three fabricated-evidence cases. Each checks all three
dimensions, but these are correlated examples, not 69 independent observations.
The fixtures are written alongside the policy and are not held out. Passing them
demonstrates the specified behavior only. There is no measured retrieval quality,
user benefit, cost saving, or commercial-system performance improvement.

## Live comparison

`npm run eval:live` compares two approaches on the same configured model:

1. A single-prompt JSON classifier given the job, candidate preferences, and the
   intended decision semantics.
2. Instructor structured extraction without candidate preferences, followed by
   exact-source checks and RoleProof's deterministic policy.

Both receive the same original descriptions. Neither receives the expected labels
or saved extractions. Three source-corruption fixtures are excluded because they
test an invalid intermediate representation rather than a job description. The
remaining 20 cases include missing data, currency ambiguity, hourly pay, overlapping
cash ranges, geographic restrictions, and conflicting wording.

Metrics:

- Correct dimensions over all attempted dimensions; failures remain visible.
- False exclusions: predicted contradicted when the label is supported or unknown.
- Unsupported confirmations: predicted supported when the label is contradicted or unknown.
- Provider/schema failure counts, tokens, and latency.
- Optional token-rate-based cost estimate using user-supplied rates. This omits
  unreported failed-call usage, discounts, and non-token charges.

The live report is written even when a provider or schema request fails. Failed
cases are not silently removed from the attempted-case denominator. Durations for
RoleProof include extraction and schema retries; the small local comparison time
is not separately benchmarked. The API cache is bypassed by this runner.

## Initial release status

No live model evaluation was executed because no API key was configured. There
is no live accuracy score to report. The fake-provider integration test confirms
the transport and validation path, not the model's extraction quality.

## Stronger next evaluation

Before making an improvement claim, freeze the prompts and policy, assemble a
separate dated sample of public listings, keep source links and retrieval dates,
and have another reviewer label applicability and ambiguity independently. Include
different countries and writing styles, real cross-location compensation ranges,
and descriptions containing irrelevant or hostile instructions. Report label
disagreements and false exclusions separately from headline correctness. Get real
product data only through an authorized integration.
