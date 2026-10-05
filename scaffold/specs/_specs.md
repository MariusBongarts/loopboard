# User-Facing Specification

> What this product does, scenario by scenario, in `GIVEN / WHEN / THEN`
> form — independent of how it's built (that's
> [`../architecture/_architecture.md`](../architecture/_architecture.md)).

Start with [§ 0 — Conventions & Glossary](00-conventions-and-glossary.md).

## Table of Contents

- [0. Conventions & Glossary](00-conventions-and-glossary.md)

## E2E coverage

Each section file carries an `## E2E coverage` table mapping every
`### Scenario:` heading to its end-to-end test. loopboard's Specs view reads
these tables (`✅ = 1, 🟡 = 0.5, ⏳ = 0, ❌ = 0`).

- ✅ — covered: the scenario's externally visible behavior is asserted
- 🟡 — partial: the scenario is richer than the test
- ⏳ — fixme: a test exists but is skipped (see the open issue)
- ❌ — not yet: no end-to-end assertion

## How to update this spec

Any change that adds, removes or alters something a user sees or does MUST
update the relevant section file in the same change: add, delete or edit the
`### Scenario:` and its coverage row. The heading is the join key with the
table, so rename both together. Add a new area as a new numbered file
(`NN-slug.md`) and link it above.
