---
id: 0118
title: "File the period's issue with a creates: issue routine"
category: user-story
status: todo
assignee: agent
project: 05-routines
phase: 1
parent: 0117
labels: [cli, routines, workflow]
created: 2026-10-27
---

## User story

As a **maintainer with duties that come back every month, quarter or year**, I
want **a routine with `creates: issue` to file the period's issue with its due
date — exactly once, without an agent**, so that **nobody has to remember to
file it, and the dispatcher can ask as often as it likes** (supersedes #0090).

## Acceptance criteria

- [ ] `period` (`day`, `week`, `month`, `quarter`, `year`) labels the slot's local day: `2026-11-03`, `2026-W45` (ISO), `2026-11`, `2026-Q4`, `2026`; `{period}`, `{previous}` and `{date}` fill `issue-title` and the body
- [ ] `due` (and `start`) file the issue with the next free number, the `issue-` fields, `due:` from `issue-due-after`, `recurrence: <slug>@<period>` and `created:`, and record an `ok` run whose note names it; a one-time routine then switches itself off
- [ ] An issue with the same `recurrence:` in `issues/` or `issues/_archive/` means nothing is filed; the run is still `ok` and names that issue
- [ ] Missed periods are recorded as `missed`, never back-filled; `--dry-run` names the issue it would file
- [ ] `loopboard check` reports two issues with the same `recurrence:` as an error
- [ ] The issues README (both scaffolds) moves `recurrence` out of the reserved fields; the glossary's Issue entry names the field; spec § 15 gains the scenarios
- [ ] Vitest: the 31st and `L` in February, 29 February, quarter starts, ISO weeks 52/53 and `{previous}` at the turn of the year, idempotence across live and archived issues, the duplicate in `check`

## Out of scope

- Closing or rolling over last period's issue — it stays what it is
- Due dates on the board (#0085)

## Notes

- PRD "Recurring issues", stories 15–18. Takes over #0090's acceptance
  criteria where they still apply.
