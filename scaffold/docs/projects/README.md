# Projects

Open a **project** when the work has *several decisions to lock up-front* —
i.e. would benefit from a PRD. A single task does not need a project; file it
directly as a standalone issue at [`../issues/`](../issues/).

A project is a time-boxed piece of work with a result you can point at: a
filed return, a signed contract, a finished move.

## Structure

Projects live at `.agents/projects/NN-slug/` with a 2-digit zero-padded running
number (`01-`, `02-`, … `99-`). Each project folder owns exactly two files:

- **`prd.md`** — the contract. Problem, Solution, User stories, Decisions,
  Evidence, Out of scope. Drafted at project start. Edited only when the
  scope or a decision really changes; the PRD always reflects current intent.
  Template: [`_templates/prd.md`](_templates/prd.md).
- **`wip.md`** — the journal. Current focus, phases as `###` headings (each
  listing its referenced issues), activity log per session, deferred items.
  Edited every working session. Template:
  [`_templates/wip.md`](_templates/wip.md).

## Numbering

- **Project IDs**: 2-digit running number from `loopboard next-id project`;
  without the CLI, `max(existing) + 1` across `.agents/projects/`.
- **Slugs**: kebab-case, derived from the title; lowercase letters, digits
  and dashes only.

## Workflow

1. **Kickoff.** Draft `prd.md` from the template. If the plan is fuzzy, have
   your agent interview you first, one question at a time, until the open
   decisions are settled.
2. **Slicing.** Break the PRD into issues at [`../issues/`](../issues/),
   each one a step that can be finished and checked on its own. Group them
   under phase headings in `wip.md`.
3. **Each session.** Read `wip.md` "Current focus" → pick a `todo` issue →
   flip to `in-progress` → do the work → tick the acceptance criteria and
   write down the evidence → flip to `done` (or to `in-review` +
   `assignee: human` when a human has to do or check something). Append a
   session entry to the `wip.md` activity log; refresh "Current focus".

## Ship gate

Set `wip.md` status to `shipped` only when:

- [ ] All issues are `done` or `wontfix`.
- [ ] Every result is where the PRD says it lives, and the ship summary
      lists the paths.
- [ ] Closed issues moved to [`../issues/_archive/`](../issues/_archive/).

The project folder stays in place after shipping — it becomes a historical
record. The running number is its identity; do not move or rename closed
project folders.
