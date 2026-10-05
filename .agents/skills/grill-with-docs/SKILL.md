---
name: grill-with-docs
description: Grilling session that challenges your plan against the existing domain model, sharpens terminology, and updates documentation (glossary, ADRs) inline as decisions crystallize. Use when the user wants to stress-test a plan against the project's language and documented decisions.
disable-model-invocation: true
---

# Grill with Docs

Interview the user relentlessly about every aspect of this plan until you
reach shared understanding. Walk down each branch of the design tree,
resolving dependencies one-by-one. For each question, provide a recommended
answer.

Ask the questions one at a time, waiting for feedback on each before
continuing.

If a question can be answered by exploring the codebase, explore the codebase
instead.

## Domain awareness

During exploration, also read the project's domain model:

- **Glossary** — [`.agents/specs/00-conventions-and-glossary.md`](../../specs/00-conventions-and-glossary.md).
  This is the canonical source of truth for shared terminology.
- **ADRs** — [`.agents/architecture/decisions/NNNN-slug.md`](../../architecture/decisions/).
  Lazy-created. Each ADR records one architectural decision and why.

Treat the repo as a single context: there is no `CONTEXT-MAP.md`.

If the glossary file exists, **add new terms inline** to it as they get
sharpened during the grilling session — don't fork a separate `CONTEXT.md`.
If it doesn't exist yet, create it with the first term. Use the existing format, see
[CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

The ADR directory may be empty initially; create files lazily, see
[ADR-FORMAT.md](./ADR-FORMAT.md).

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in the
glossary, call it out immediately.

> "Your glossary defines **Module** as a content block inside a template, but
> you seem to be using it for the news/quote subtype. Which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical
term.

> "You're saying 'subscriber' — do you mean **Subscriber** (the person who
> receives the email) or the **User** (the account that owns the template)?
> Those are different things in this codebase."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific
scenarios. Invent scenarios that probe edge cases and force precision about
the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If
there's a contradiction, surface it.

> "You said templates can be paused mid-execution, but the code in
> `executeTemplate` only reads `status === 'active'` at queue time — which is
> right?"

### Update the glossary inline

When a term is resolved, add it to
[`.agents/specs/00-conventions-and-glossary.md`](../../specs/00-conventions-and-glossary.md)
right there. Don't batch these up — capture them as they happen. Use the
existing bullet format described in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful.
2. **Surprising without context** — a future reader will wonder *"why did
   they do it this way?"*
3. **The result of a real trade-off** — there were genuine alternatives and
   you picked one for specific reasons.

If any of the three is missing, skip the ADR. Use the format in
[ADR-FORMAT.md](./ADR-FORMAT.md).

---

_Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT, © 2026 Matt Pocock). See [CREDITS.md](../CREDITS.md)._
