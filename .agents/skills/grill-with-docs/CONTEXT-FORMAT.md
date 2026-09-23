# Glossary format

The canonical glossary lives at
[`ai/specs/00-conventions-and-glossary.md`](../../../ai/specs/00-conventions-and-glossary.md).
It is a flat bullet list. Every entry follows the same shape:

```markdown
- **Term** — concise definition, one or two sentences. Reference the related
  Firestore collection, code path, or sibling term where helpful (use bold for
  cross-references to other glossary terms).
```

## Existing examples

The file already contains entries like:

```markdown
- **Template** — a user-defined newsletter blueprint. It has a name, language,
  delivery time, list of recipients, and an ordered list of modules. Each
  template has a status: `draft`, `active`, `paused`, or `archived`.

- **Module** — a content block inside a template. Module types currently
  include `news`, `quote`, and (defined but disabled in the UI) `weather` and
  `calendar`.

- **Execution** — one run of a template at one delivery time. Has a status:
  `queued`, `pending`, `sent`, or `failed`.
```

Match that style when adding terms. Keep entries tight (1–2 sentences). Use
`code formatting` for status enum values, type names, and field names.

## Rules

- **Be opinionated.** When multiple words exist for the same concept, pick
  the best one. Mention rejected aliases inline only when the rejection is
  load-bearing (otherwise they create noise).
- **Define what it IS, not what it does.** "An Execution is one run of a
  template" — not "An Execution runs the template's modules and sends an
  email."
- **Show relationships.** Use **bold** for cross-references to other terms.
  Express cardinality where it matters ("each Template has zero-or-more
  Executions").
- **Only include terms specific to this project's domain.** General programming
  concepts (timeouts, error types, utility patterns) don't belong even when
  the project uses them extensively.
- **Cross-reference code lightly.** Names of Firestore collections,
  TypeScript types, or env vars are useful anchors. File paths and line
  numbers are not — they go stale.

## Optional extensions (only when the file warrants them)

The current bullet-list format is intentionally lean. Don't impose extra
structure unless the file grows enough to need it. When that happens, the
following sections may be added:

### `## Aliases`

A short table mapping rejected aliases to the canonical term, useful when a
term has accumulated multiple competing labels in the codebase.

| Avoid | Use instead |
|---|---|
| edition | **Letter** when in-app render; **Execution** when scheduled run |

### `## Relationships`

Bullet list of high-level relationships between terms.

- A **Template** produces zero-or-more **Executions** (one per delivery time).
- An **Execution** delivers a **Letter** to one-or-more recipients.
- A **Module** belongs to exactly one **Template**.

### `## Flagged ambiguities`

Use only when a term was historically used ambiguously and the resolution
needs to be visible.

- "edition" was used to mean both **Execution** (scheduled run) and **Letter**
  (in-app render of an Execution) — resolved: these are distinct concepts.

Add these sections only when there are at least 3–4 entries to put under
each. Below that threshold, weave the same information into the bullet list
prose.
