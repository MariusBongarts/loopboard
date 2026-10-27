---
id: 0124
title: Let a routine's run commit and push the paths it names with commits
category: user-story
status: backlog
assignee: agent
project: 05-routines
phase: 4
labels: [routines, cli, git]
created: 2026-10-27
---

## User story

As a **maintainer whose routine feeds something that reads only committed
files** — a GitHub Action, a deploy, a teammate's checkout — I want **a routine
to name the paths its run may commit and push**, so that **its results arrive
the same day without me committing by hand, while everything else a run
touches stays uncommitted**.

## Why now

Filed on 2026-10-27 from the prodapps session that set up the routine
`email-check`. It logs makers' replies in the partner records under
`packages/partners/data/`. prodapps' outreach GitHub Action (13:30 UTC daily)
reads only committed records, so a reply logged at 07:30 and left uncommitted
gets the maker another sequence mail. Today the brief's rule 2
(`server/brief.ts`, "Never commit, push or publish") is unconditional, so a
step that says "commit" contradicts the brief. Marius commits by hand for
now and wants a scoped exception.

## Acceptance criteria

- [ ] `routine.md` takes `commits: [<glob>, …]`, globs relative to the harness folder (`packages/partners/data/**`); `loopboard check` reports a glob that doesn't parse, points outside the harness or matches nothing tracked (a warning)
- [ ] With `commits:` the brief's rule 2 allows exactly this: commit the changes under those paths and push them; everything else stays forbidden, and a run that changed other files leaves them uncommitted and says so in its note
- [ ] The commit never happens in the maintainer's checkout: it is built from a fresh worktree or a temporary index on top of `origin/<default branch>` and pushed as that commit, so his unfinished local commits and staged files never travel along
- [ ] When a listed path changed upstream after the run read it, the push is refused and the run fails with the paths named, instead of overwriting
- [ ] One commit per run, its message prefixed with the routine (`routine <slug>: …`), the run's note naming the commit; the run's entry in `runs.md` records it (a `commit:` field)
- [ ] `docs/routines.md`, the scheduled README (code and docs scaffolds), the `routine` skill and the README's table name the field; spec § 15 gains the scenario
- [ ] Vitest on real temp git repos with a bare remote: only listed paths committed, local commits not pushed, upstream change refused, a run without `commits:` unchanged

## Questions

1. **Who commits — the run's sub-agent following the brief, or loopboard?**
   Proposal: loopboard, as `loopboard routines finish <routine> --commit`
   (or a separate `routines commit`), so the temp-index steps live in one
   tested place and the brief only says "run finish with --commit". The
   prodapps session did it by hand on 2026-10-27 with a temporary
   `GIT_INDEX_FILE`, `git apply --cached`, `commit-tree` and
   `git push origin <sha>:refs/heads/main`; that left the checkout untouched.
2. **Afterwards, the checkout** still holds the same changes uncommitted.
   Leave them (the next pull reconciles), or restore those paths? Proposal:
   leave them and say so in the note.
3. **Push target:** always the default branch, or a `commits-to:` branch?
   Proposal: the default branch only, until a routine needs more.

## Out of scope

- Committing paths in another harness (`writes-to`) — one repo per routine
- Opening pull requests

## Notes

- Amends decision 8 of the PRD ("no run commits by itself") and ADR-0010's
  "no run commits": when built, record the exception in a short ADR or an
  amendment to 0010, and in the dispatcher prompt's rules.
- The temp-index approach must work in a repo with other worktrees and with
  a dirty checkout; never `git stash`.
