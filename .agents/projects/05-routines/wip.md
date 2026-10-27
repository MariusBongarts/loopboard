# Routines — WIP

> Last updated: 2026-10-27
> PRD: [./prd.md](./prd.md)
> Status: in-progress

## Current focus

Kickoff on 2026-10-27, from the grill of the same day: the PRD, ADR-0010 and
the glossary entries are written, #0090 is closed as superseded, and ten
issues cut the work into three phases. Phase 1 builds routines end to end on
the command line — files, schedules, runs, `due`, recurring issues and the
briefs — so a dispatcher can run them before the board shows anything. Next:
[#0114](../../issues/0114-routines-list-and-schedules.md).

## Phases

### Phase 1 — Routines on the command line

Goal: a routine is a folder in the harness, its schedule is understood in its time zone, and a dispatcher can ask what's due, record runs, file the period's issue and hand each run a brief.

- [ ] [#0114 See a harness's routines and their next slot with loopboard routines list](../../issues/0114-routines-list-and-schedules.md) — todo
- [ ] [#0115 loopboard check validates routines](../../issues/0115-check-validates-routines.md) — todo
- [ ] [#0116 Record runs with routines start and finish](../../issues/0116-record-runs-with-start-and-finish.md) — todo
- [ ] [#0117 Ask what is due with loopboard routines due](../../issues/0117-routines-due.md) — todo
- [ ] [#0118 File the period's issue with a creates: issue routine](../../issues/0118-recurring-issues-from-routines.md) — todo
- [ ] [#0119 Brief each run and print the dispatcher prompt](../../issues/0119-briefs-and-dispatcher-prompt.md) — todo

### Phase 2 — Routines on the board

Goal: a read-only Routines view per workspace with a contribution graph per routine and one for the workspace.

- [ ] [#0120 See routines and their runs in a Routines view](../../issues/0120-routines-view.md) — todo
- [ ] [#0121 See a year of runs as a contribution graph](../../issues/0121-routine-contribution-graphs.md) — todo

### Phase 3 — Harnesses and docs

Goal: every harness gets the folder, the skill and the rule, existing ones through an upgrade, and the docs say how to set up a dispatcher.

- [ ] [#0122 Scaffold routines, add the routine skill and the AGENTS rule, migrate with M003](../../issues/0122-scaffold-skill-rule-and-migration.md) — todo
- [ ] [#0123 Document routines for users](../../issues/0123-document-routines.md) — todo

## Activity log

### 2026-10-27

- Kickoff. The sixteen decisions of the grill are the frame (German copy in
  the maintainer's own tree). Written: PRD, ADR-0010 (routines are files, a
  dispatcher outside loopboard runs them, `--under` amends ADR-0002), the
  glossary's Routine, Run, Slot, Dispatcher and Brief, and #0114–#0123.
  #0090 is `wontfix`, superseded by this project; project 04's WIP and PRD
  point here.
- Decided while writing the PRD, within the grill's frame: fields are read
  from raw lines, not YAML (cron starts with `*`); `runs.md` entries are
  headings with `- key: value` lines and the note as a block quote; a run's
  entries are tied by `started`; `missed` is one entry per catch-up; `due`
  writes its bookkeeping and `--dry-run` writes nothing, as `init` and
  `renumber` do; `creates: issue` fields carry an `issue-` prefix; `L` is the
  one cron extension; the rail shows Routines only in a harness that has
  one, so the demo fixture's visual baselines stay; the `routine` skill is
  a core skill, like `grill-me`.

## Deferred / out of scope (added during execution)

- None yet.

## Ship summary

(Filled in only when status flips to `shipped`.)
