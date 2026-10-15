# RoleProof

Evidence-backed job match explanations. Separate what a listing supports, what
it contradicts, and what it leaves unknown.

## Build scope

- TypeScript and React interface with interactive preference changes.
- Instructor JS for structured extraction; exact source quotations checked in code.
- Deterministic comparison of location, cash compensation, and requested skills.
- Explicit uncertainty for absent evidence, conflicting clauses, and ambiguous salary.
- Labelled fixtures, regression tests, and a reproducible evaluation harness.

The extraction library is reused as a dependency rather than copied or rebranded.
Application logic, the interface, and evaluation cases are specific to RoleProof.

## Run locally

Node.js 22.12 or newer is required.

```sh
git clone https://github.com/ItsM0rty/roleproof.git
cd roleproof
npm ci
npm run dev
```

Open http://127.0.0.1:4317. Five clearly labelled fictional examples work without
credentials. Change country, cash minimum, or technologies; select a Source
reference to highlight its quotation; export the explanation as JSON.

To analyze your own listing, copy `.env.example` to `.env`, set `OPENAI_API_KEY`
and optionally `ROLEPROOF_MODEL`, then restart the server. Choose **Analyze your
own listing**, paste the description, and select **Analyze listing**. The model
must support OpenAI-compatible tool calls through the OpenAI API. The configured
default is `gpt-4o-mini`; model access and availability depend on your account.

```sh
npm run build
npm start
```

Production assets and the API are then served together at http://127.0.0.1:4318.
The server intentionally binds to loopback. This is a local demo, not a hosted
multi-user service. If changing the frontend/API ports, also change the Vite proxy
and the origin allowlist in `server/app.ts`.

### Browser-only hosted demo

The portfolio demo at https://www.suyashbhattarai.com.np/demo-roleproof uses
saved, clearly labelled facts. Preferences and source highlights work in the
browser without a server or model request. Custom-listing extraction remains
available through the local setup above.

`npm run build:demo` produces this static version, with asset URLs rooted at
`/demos/roleproof/`. The portfolio serves the generated HTML at `/demo-roleproof`
and the assets under `/demos/roleproof/assets/`. This mode never calls `/api/health`
or `/api/analyze` and links to the local setup for custom listings.

## What the demo decides

| Dimension | Supported | Contradicted | Unknown |
| --- | --- | --- | --- |
| Hiring location | Explicit hiring scope includes the selected country | Explicit hiring scope excludes it | Missing, conflicting, ambiguous, or unmapped location evidence |
| Base cash | Entire comparable advertised range meets the minimum | Advertised maximum is below the minimum | Overlapping range, missing currency/period/base-pay evidence, or several ranges |
| Technologies | All preferred technologies are mentioned | Never inferred from absence | At least one preferred technology is not established |

An unknown does not remove a role. The aggregate result is a short description,
not a probability or qualification score. Salary minimum 0 and an empty technology
list disable those preferences.

Monthly base pay is multiplied by 12. Hourly pay is not annualized without working
hours. Currencies are never converted. Only Europe, EU, EEA, LATAM, and North
America have explicit region mappings; other region names remain unresolved.
Country names are extracted as ISO alpha-2 codes. Geography is a matching policy,
not a determination of work authorization, sponsorship, or an employer's ability
to hire someone. Time-zone overlap, seniority, experience, benefits, and employment
arrangements are outside this prototype's decisions.

## How it works

```text
Job description -> Instructor JS + Zod -> structured facts
                                        |
Candidate preferences ----------------> exact-quote checks
                                        |
                                  deterministic policy
                                        |
                          explanation + source character spans
```

The model extracts facts without seeing the candidate preferences. Every proposed
quotation must exist verbatim in the listing. A quotation absent from the source
withholds that dimension's conclusion and adds a warning. Offsets are JavaScript
UTF-16 string indices shared by the API and browser; repeated quotations refer to
their first occurrence.

**A matching quotation is evidence of presence, not proof that the model interpreted
it correctly.** A model can misclassify a clause or salary while quoting real text.
Structured output validation and prompt-injection instructions cannot establish
semantic correctness. The UI exposes the passage so the interpretation is reviewable.
See [architecture and limits](docs/architecture.md).

## Verify

```sh
npm run check
```

Runs regression tests, synthetic policy replay, TypeScript checking, and the
production build. CI runs on Windows and Ubuntu with Node 22 and 24.

Initial local verification: **35 tests passed; 23/23 synthetic policy scenarios
passed**. The integration test uses the real Instructor package and OpenAI SDK
against a local fake HTTP provider, including a schema validation retry. These
numbers do **not** measure live LLM accuracy or real-world job-search outcomes.
See [evaluation methodology](docs/evaluation.md).

### Live baseline comparison

With an API key in `.env`:

```sh
npm run eval:live
```

Compares a single-prompt classifier with Instructor extraction plus RoleProof's
policy on the same model and 20 author-labelled synthetic scenarios. Reports
per-dimension correctness, false exclusions, unsupported confirmations, latency,
and token use. Three deliberately fabricated extraction cases belong only to
policy replay and are excluded from live evaluation.

Set `EVAL_LIMIT` to a smaller positive integer for a smoke run. Cost estimates
are omitted unless you explicitly supply `INPUT_USD_PER_MILLION` and
`OUTPUT_USD_PER_MILLION` using your current rates. Reports are saved under
`evals/results/`, which is ignored by Git. Failed calls can still incur costs.

**No live-model benchmark has been run for the initial release.** No API key was
configured in the implementation session. The harness makes paid requests only
when explicitly invoked with a key. Do not interpret the policy replay as an
extraction benchmark or claim an improvement over the baseline without running it.

### Promptfoo

The optional Promptfoo adapter uses the same cases and policies. Promptfoo 0.124.1
requires Node 22.22 or newer (Node 24 is also suitable). Core development does not
require Promptfoo's larger dependency tree.

```sh
npx --yes promptfoo@0.124.1 eval --config promptfooconfig.ts --no-cache
```

For a paid live comparison, make `OPENAI_API_KEY` available to the process, or use
Promptfoo's `--env-file .env` option:

```sh
npx --yes promptfoo@0.124.1 eval --config promptfoo.live.config.ts --env-file .env --no-cache
```

Promptfoo can store prompts and outputs in its local result history; use synthetic
cases and avoid publishing result files containing private descriptions.

## Local data handling

- Samples and preference changes run entirely in the browser; nothing is stored
  in localStorage or a database.
- Live extraction sends the listing to the model provider. The candidate profile
  is compared by the local API and is not included in the extraction prompt.
- Up to 32 extracted listings are cached in server memory. Extractions are reused
  for 15 minutes across preference changes; expired entries remain in memory until
  eviction or restart. A restart clears the cache. There is no disk cache.
- The local API caps uncached calls at 20 per ten minutes and two concurrent
  extractions. Each extraction permits one schema retry; SDK retries are disabled.
- The key remains server-side. `.env`, results, build artifacts, and dependencies
  are excluded from Git. Never put the key in a `VITE_` environment variable.
- JSON exports contain the supplied listing and preferences. Share them deliberately.

## License

MIT. Uses Instructor JS for structured extraction and Promptfoo for optional evaluations.
