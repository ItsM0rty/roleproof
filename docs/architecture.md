# Architecture and boundaries

The extraction stage and the decision policy are deliberately separate. One
listing can be extracted once and compared against several profiles without
sending candidate preferences to the model or paying for another extraction.

## Extraction boundary

`server/extract.ts` uses the upstream Instructor JS package in TOOLS mode with a
Zod schema. The listing is an escaped JSON string inside a user message; system
instructions tell the model to treat its contents as untrusted source material.
This is a mitigation, not proof of prompt-injection resistance.

The OpenAI SDK uses a 40-second timeout per HTTP attempt and zero automatic SDK
retries. Instructor allows one schema retry. Both attempts count in recorded token
usage when the provider reports usage. Failed or malformed responses can still
incur unrecorded charges. The local API returns a generic failure and no conclusion
when extraction fails. It does not fall back to a fabricated explanation.

## Evidence boundary

`src/core/engine.ts` checks exact quotations using `String.indexOf`. Missing quotes
quarantine their whole dimension, rather than dropping only the inconvenient
claim. The source links use start/end indices for the same original string that
the engine analyzed. A repeated quotation links to its first occurrence.

Text presence is weaker than entailment. The engine does not prove that a USD
amount, region code, or technology name follows from the quotation. An upstream
interpretation error can survive quote checking. Live labelled extraction cases
and human inspection are needed to assess that failure rate.

## Decision boundary

The policy is deterministic, explicit, and conservative. It handles only three
dimensions. Unknown regions and multiple salary ranges remain unknown rather
than guessing which applies. Separate location clauses with differing results
remain unknown; this can also over-withhold when a listing presents alternatives
across several sentences. The extractor is asked to represent a list of permitted
locations in one clause as a union.

Region mappings are static product conventions. They do not settle disputed
geography, hiring jurisdictions, or legal eligibility. Work authorization and
sponsorship are not adjudicated. No protected attributes are used to rank people.

## Application boundary

The browser can replay synthetic facts without a server key. It recomputes policy
locally when preferences change. In live mode, the API validates input and extracts
the listing, then returns facts, findings, citation spans, and usage metadata.
Changing an example or opening custom mode invalidates pending UI requests so a
late result cannot overwrite another listing. React renders source text as text,
not HTML.

The API is a loopback-only development tool. It has request-size limits,
cross-origin checks, a small in-memory cache, and a local request budget, but no
multi-user authentication, distributed rate limit, durable storage, or billing.
It must not be exposed publicly with a provider key without designing those
controls. Do not add a tunnel as a substitute for that work.

## What production integration would need

An ATS/listing data contract, real labelled examples, employer-specific hiring
metadata, model/version pinning, extraction drift monitoring, an agreed region
policy, appropriate privacy controls, and review of unknowns. Matcha's internal
requirements and current feature set have not been inspected. The prototype is
an independently runnable example of a possible product behavior.
