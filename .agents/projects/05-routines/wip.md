# Routines — WIP

> Last updated: 2026-10-27
> PRD: [./prd.md](./prd.md)
> Status: in-progress

## Current focus

All ten issues are `done` (2026-10-27): routines are files in
`.agents/scheduled/`, `loopboard routines list|due|start|finish|prompt|dispatcher-prompt`
run them end to end, `check` validates them, recurring issues file
themselves (#0090 is superseded), the board has a read-only Routines view
with contribution graphs, and `init`, the `routine` skill, the AGENTS rule
and M003 bring them to every harness. What's left for the ship gate is the
maintainer's: a look at the Routines view and a first real dispatcher run
on a platform, then an issue-grooming run that archives #0114–#0123. Later,
in other sessions: the private dashboard reads `routines list --json`
(documented in `docs/routines.md`), and existing platform tasks move into
routines (M003, step 6). Phase 4 holds what the first routines turned up: #0125
(`writes-to` misses a harness registered under another id) is next;
#0124 (a scoped `commits:` field) waits in the backlog, since it amends
decision 8.

## Phases

### Phase 1 — Routines on the command line

Goal: a routine is a folder in the harness, its schedule is understood in its time zone, and a dispatcher can ask what's due, record runs, file the period's issue and hand each run a brief.

- [x] [#0114 See a harness's routines and their next slot with loopboard routines list](../../issues/0114-routines-list-and-schedules.md) — done
- [x] [#0115 loopboard check validates routines](../../issues/0115-check-validates-routines.md) — done
- [x] [#0116 Record runs with routines start and finish](../../issues/0116-record-runs-with-start-and-finish.md) — done
- [x] [#0118 File the period's issue with a creates: issue routine](../../issues/0118-recurring-issues-from-routines.md) — done
- [x] [#0117 Ask what is due with loopboard routines due](../../issues/0117-routines-due.md) — done
- [x] [#0119 Brief each run and print the dispatcher prompt](../../issues/0119-briefs-and-dispatcher-prompt.md) — done

### Phase 2 — Routines on the board

Goal: a read-only Routines view per workspace with a contribution graph per routine and one for the workspace.

- [x] [#0120 See routines and their runs in a Routines view](../../issues/0120-routines-view.md) — done
- [x] [#0121 See a year of runs as a contribution graph](../../issues/0121-routine-contribution-graphs.md) — done

### Phase 3 — Harnesses and docs

Goal: every harness gets the folder, the skill and the rule, existing ones through an upgrade, and the docs say how to set up a dispatcher.

- [x] [#0122 Scaffold routines, add the routine skill and the AGENTS rule, migrate with M003](../../issues/0122-scaffold-skill-rule-and-migration.md) — done
- [x] [#0123 Document routines for users](../../issues/0123-document-routines.md) — done

### Phase 4 — Follow-ups from the first routines

Goal: what setting up the first routines in webhighlights and prodapps turned up.

- [ ] [#0125 writes-to warns about a harness that is registered under another workspace id](../../issues/0125-writes-to-misses-a-harness-registered-under-another-id.md) — todo
- [ ] [#0124 Let a routine's run commit and push the paths it names with commits](../../issues/0124-routine-commits-named-paths.md) — backlog

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

- #0114 done: `shared/cron.ts` (cron and `at` in an IANA zone, the DST
  rules, schedules in words, no dependency), `server/runs.ts` (reading
  `runs.md`), `server/routines.ts` (raw-line reading, validation, harnesses
  under a folder, the `version: 1` summary) and `loopboard routines [list]`
  with `--under` and `--json`. Spec § 15 started. The list reader for
  `aliases` moved to `shared/frontmatter.ts` (`readAnyList`) and now also
  reads `writes-to` and `issue-labels`.
- #0115 done: `check` lists every routine problem as
  `scheduled/<slug>/routine.md` (or `runs.md`) with its reason; errors fail
  the check, warnings only with `--strict`; the closing line counts valid
  routines. A problem now carries the file it is about. The names a
  registered workspace answers to moved from `init.ts` to
  `workspaceNames()` in `workspaces.ts`, shared with `check`.
- #0116 done: `routines start` and `finish` append to `runs.md` under its
  lock; the state of a routine (due, running, paused, pinned, expired, idle,
  invalid) comes from one `evaluate()` in the new `server/dispatch.ts`, which
  now also builds the summaries. #0118 moved before #0117: `due` files the
  period's issue through the same path `start` uses. Small shared changes:
  a lone `-` is a flag value (stdin), and `shellWord()` quotes paths for
  printed commands (renumber's hint uses it too).
- #0118 done: a `creates: issue` routine's `start` files the period's issue
  itself (`createIssue` gained a body, `due` and `recurrence`), idempotent by
  `recurrence:` across live and archived issues, and records the run as ok
  or failed; a gap files the latest period and records the rest as missed.
  `check` reports duplicate recurrences. The issues READMEs (both
  scaffolds) moved `recurrence` out of the reserved fields.
- #0117 done: `routines due [path]` / `--under <dir>` lists what to run and
  writes the bookkeeping that needs no agent — aborted runs, expired slots
  (a one-time routine switches off), the period's issues — or nothing with
  `--dry-run`; `--json` is the `version: 1` shape the dispatcher reads.
- #0119 done: `routines prompt` prints the brief, `routines
  dispatcher-prompt` the dispatcher prompt from `docs/dispatcher-prompt.md`
  (now in the package's files) with the scope filled in.
  `docs/routines.md` starts with the setup for Claude Code, Codex and cron;
  #0123 completes it. Phase 1 is done: routines run end to end from the
  command line.
- #0120 done: a read-only Routines view (`/w/:ws/routines`, a page per
  routine) fed by `GET /api/w/:id/routines`; the rail lists it only in a
  harness with routines, ⌘K always. Run states got their own tokens
  (`--run-ok`, `--run-failed`, `--run-missed`, `--run-running`), checked by
  the contrast script at 3:1. The view is checked in the browser in both
  themes and on a narrow pane.
- #0121 done: the server computes each routine's graph days
  (`server/graph.ts`; `list --json` carries them as `days`), the client
  draws them in `RoutineGraph.vue` and sums them for the workspace. Graph
  shades are tokens (`--graph-1`…`--graph-4`, `--graph-empty`), all at 3:1
  or more against the background in both themes. `GRAPH_WEEKS` and
  `graphStart` live in `shared/cron.ts` for both sides. Phase 2 is done.
- #0122 done: `.agents/scheduled/README.md` and `_templates/routine.md` in a
  code and a docs version, the core skill `routine` (also linked in this
  repo), the "Recurring work" rule in both AGENTS blocks, migration M003;
  this repo's block is at M003. Tests that pin the docs scaffold's file
  list count the two new files. The README, Help → Set up, the folder map
  and the workflow doc name the skill and the folder. The full E2E run's
  only failures are the two inbox baselines of #0112, as before.
- #0123 done: `docs/routines.md` is the full guide — format, schedules,
  when a routine runs, `runs.md`, commands, the dispatcher's three setups —
  and documents `list --json`, `due --json` and `start --json` field by
  field; a test keeps the documented fields equal to what the commands
  print. `start --json` now gives `slot` as an ISO time like everything
  else. The README's CLI table, Help → Set up and Help → Reference (the
  guide without its JSON part, headings one level down) and the CHANGELOG
  name routines.

- Later on 2026-10-27: merged to main, worktree removed, the CLI linked
  with `npm link`. webhighlights got M003 by hand and the routine
  `support-inbox`; a prodapps session set up `email-check`. Filed from
  that: #0124 and #0125 (phase 4), and #0126 as a standalone bug —
  `init --upgrade` would append a second workflow block to a customized
  AGENTS.md, which is why webhighlights was upgraded by hand.

## Deferred / out of scope (added during execution)

- A visual baseline for the Routines view — the graph depends on today's
  date; it needs a fixed clock in `visual.spec.ts` first. The view is
  covered by `15-routines.spec.ts` and was checked by eye in both themes.
- Pausing or running a routine from the board — the PRD keeps the view
  read-only; the skill and the files are the editors.

## Ship summary

(Filled in only when status flips to `shipped`.)
