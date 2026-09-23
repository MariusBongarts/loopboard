# Projects

Open a **project** when the work has *multiple decisions to lock up-front* —
i.e. would benefit from a PRD. A single bug fix or one-off chore does not
need a project; file it directly as a standalone issue at
[`../issues/`](../issues/).

A project is a time-boxed delivery that produces:

1. Updates to [`../specs/*`](../specs/) (user-facing behavior).
2. Updates to [`../architecture/*`](../architecture/) (technical structure).
3. Shipped code.

## Structure

Projects live at `ai/projects/NN-slug/` with a 2-digit zero-padded running
number (`01-`, `02-`, … `99-`). Each project folder owns exactly two files:

- **`prd.md`** — the contract. Problem, Solution, User stories,
  Implementation decisions, Testing decisions, Out of scope. Drafted at
  project start. Edited only on real scope/decision changes; the PRD always
  reflects current intent. Template:
  [`_templates/prd.md`](_templates/prd.md).
- **`wip.md`** — the journal. Current focus, phases as `###` headings (each
  listing its referenced issues), activity log per session, deferred items.
  Edited every working session. Template:
  [`_templates/wip.md`](_templates/wip.md).

## Numbering

- **Project IDs**: 2-digit running number, computed as `max(existing) + 1`
  across `ai/projects/`.
- **Slugs**: kebab-case, derived from the title.

## Workflow

1. **Kickoff.** Draft `prd.md` (skill:
   [`to-prd`](../../.agents/skills/to-prd/SKILL.md)). If requirements are
   fuzzy, run [`grill-me`](../../.agents/skills/grill-me/SKILL.md) first; if
   architectural decisions are involved, run
   [`grill-with-docs`](../../.agents/skills/grill-with-docs/SKILL.md) so
   terms land in the glossary and decisions land as ADRs inline.
2. **Plan crystallization.** Break the PRD into vertical-slice issues at
   [`../issues/`](../issues/) (skill:
   [`to-issues`](../../.agents/skills/to-issues/SKILL.md)). Group them under
   phase headings in `wip.md`.
3. **Each session.** Read `wip.md` "Current focus" → pick a `todo` issue →
   flip to `in-progress` → implement → flip to `in-review` → maintainer
   verifies → flip to `done`. Append a session entry to the `wip.md`
   activity log; refresh "Current focus".

## Ship gate

Set `wip.md` status to `shipped` only when:

- [ ] All issues are `done` or `wontfix`.
- [ ] Spec sections updated for every user-visible delta (list which
      `ai/specs/*.md` files were touched).
- [ ] Architecture docs updated for every new collection / route /
      pipeline step.
- [ ] Glossary additions migrated to
      [`../specs/00-conventions-and-glossary.md`](../specs/00-conventions-and-glossary.md)
      (no glossary stays in `wip.md`).
- [ ] Closed issues moved to [`../issues/_archive/`](../issues/_archive/).
- [ ] Audit pass: `wip.md` and `prd.md` carry no architecture / glossary
      content.

The project folder stays in place after shipping — it becomes a historical
record. The running number is its identity; do not move or rename closed
project folders.
