---
id: 0136
title: Open decisions in run logs — read and answer them, morning summary and decision round in the dispatcher prompt, decisions on Home
category: task
status: done
assignee: agent
project: 05-routines
phase: 4
labels: [routines, dispatcher, home]
created: 2026-10-30
---

## What needs to change

webhighlights (project 52, `webhighlights#1276`) gave every routine a run
log (`<routine>/log/YYYY-MM.md`, one section per run, newest on top) with
**open decisions**: what an unattended run can't settle alone, with a
stable id, two to four options and a recommendation. Nobody asks them yet.
Move the reading, the answering and the asking upstream, so every harness
gets the same contract:

1. **Document** the run log and the open-decision format in
   `docs/routines.md` and the shipped scheduled README.
2. **A server module** reads a routine's live decisions from its run logs
   (newest occurrence of an id wins; `open` and `answered` are live) and
   records an answer or an application in the newest section. CLI:
   `loopboard routines decisions [path] --json` and
   `loopboard routines answer <id> --choice <option|text>` (or
   `--applied <what>`). `check` reports malformed decisions.
3. **The dispatcher prompt** ends with the morning summary (headlines, one
   merged NEEDS YOU list, the blocks, 🔗 as links) and the open decisions.
   It never blocks a beat on a question: when the maintainer replies in
   that session, it asks them in the question UI (at most eight, oldest
   first), records each answer, applies what `## On answer` gives the
   dispatcher and proposes sessions for the rest.
4. **Home** lists the open decisions per workspace.
5. **M004** tells existing harnesses to adopt the run log and regenerate
   their dispatcher task's prompt.

## Why

Runs are unattended and can't ask. The dispatcher's session is the one
place the maintainer can answer, and doing it in loopboard gives every
harness the same summary and decisions.

## Acceptance criteria

- [x] Unit tests: reading open decisions, recording an answer, carrying an
      open decision forward into the newest section, rejecting a malformed
      section.
- [x] `dispatcher-prompt` prints the summary and the decision round;
      `docs/dispatcher-prompt.md` is its source.
- [x] Home shows open decisions; an e2e test covers it and spec §16 says so.
- [x] `pnpm verify` is green.

## Notes

- A scheduled-task session in the Claude Code desktop app is an ordinary
  session, but while it waits on a question its run stays in progress and
  the next beat can't start. Hence: summary first, questions only once the
  maintainer replies.

## Memory

### 2026-10-30

- `shared/decisions.ts`: `parseRunLog` (sections, `### Open decisions`,
  `#### <id> · <question>` blocks, fences skipped, problems for bad
  sections and decisions), `liveDecisions` (newest occurrence wins,
  `open`/`answered` live, `inNewest`), `changedBlock`, `normalizeChoice`.
- `server/runLog.ts` reads `log/YYYY-MM.md`; `server/decisions.ts`:
  `harnessDecisions`, `recordDecision` (in place, or carried into the
  newest section/month), `carryInto`. `summarizeRoutine` carries
  `decisions`; `checkRoutines` warns with `scheduled/<slug>/log/…`.
- CLI `routines decisions [path] (--under, --json)` and
  `routines answer <id> --choice|--applied (--path, --dry-run)`.
- `docs/dispatcher-prompt.md`: steps 4–5 summary + listed decisions, 6–9
  the round once the maintainer replies. Why not ask during the beat: a
  desktop scheduled run is an ordinary session, and while it waits its run
  stays in progress, so the next beats can't start. A live probe (a
  one-time scheduled task) was refused by the auto-mode classifier.
- Home: `HomeDecision`, `decisionHint`, the "Open decisions" side card.
  Docs: `docs/routines.md` (Run log and open decisions, commands, JSON),
  both scheduled READMEs + `_templates/log.md`, README table, CHANGELOG,
  M004 (AGENTS marker moved). Specs §15 (two scenarios, prompt) and §16.
- Verify: `pnpm verify` 549 tests + contrast green; Playwright §15 + §16
  13/13 (new: decisions follow an answer live); `pnpm build` done, the
  binary lists webhighlights' decisions (none yet) and `due --dry-run` is
  clean.
- Next: webhighlights regenerates its dispatcher task from
  `dispatcher-prompt` (the maintainer's step) and watches the first beat
  with a decision (hero call on 2026-10-31).
