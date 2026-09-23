# {Project Title} — WIP

> Last updated: YYYY-MM-DD
> PRD: [./prd.md](./prd.md)
> Status: in-progress | shipped | paused

## Current focus

One paragraph: which phase + which issue is active right now, and what unblocks
the next session. A resuming agent reads this paragraph first; if stale, the
agent updates it before doing anything else.

## Phases

### Phase 1 — {Phase slug}

Goal: one-line description of what this phase delivers.

- [ ] [#NNNN Issue title](../../issues/NNNN-issue-slug.md) — todo
- [ ] [#NNNN Issue title](../../issues/NNNN-issue-slug.md) — in-progress
- [ ] [#NNNN Issue title](../../issues/NNNN-issue-slug.md) — todo

### Phase 2 — {Phase slug}

Goal: ...

- [ ] [#NNNN Issue title](../../issues/NNNN-issue-slug.md) — todo

## Activity log

### YYYY-MM-DD

- Free-form prose. Decisions made, blockers hit, surprises found, "I tried X, it
  didn't work because Y, here's the fix". One entry per working session.
- Append-only — never delete history.

### YYYY-MM-DD

- Earlier entry...

## Deferred / out of scope (added during execution)

Items punted *after* the PRD was drafted. Distinguish from the PRD's original
"Out of scope" section so future readers can tell what was foreseen vs
discovered.

- Item — short rationale.

## Ship summary

(Filled in only when status flips to `shipped`.)

Shipped on YYYY-MM-DD.

- [ ] All issues moved to `done` or `wontfix`
- [ ] Spec sections updated (list `ai/specs/*` files touched)
- [ ] Architecture docs updated (list `ai/architecture/*` files touched)
- [ ] Glossary additions migrated to `ai/specs/00-conventions-and-glossary.md`
- [ ] Closed issues moved to `ai/issues/_archive/`
- [ ] Audit pass: this `wip.md` and the `prd.md` carry no architecture or
      glossary content
