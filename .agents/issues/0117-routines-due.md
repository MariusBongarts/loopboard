---
id: 0117
title: Ask what is due with loopboard routines due
category: user-story
status: done
assignee: agent
project: 05-routines
phase: 1
parent: 0118
labels: [cli, routines]
created: 2026-10-27
---

## User story

As a **dispatcher**, I want **one command that says which routines are due
now — in this harness or in every harness under a folder — and does the
bookkeeping that needs no agent**, so that **I only start sub-agents for
routines that really have a slot to run**.

## Acceptance criteria

- [x] A routine is due when it is enabled, valid, not pinned to another `host`, nothing of it is running, and its slot — the latest occurrence ≤ now, ignoring occurrences before its `created` day — is later than its last handled time (PRD "Schedules and due")
- [x] A `running` entry older than `timeout` becomes `aborted` (a note says so) and the routine is evaluated again
- [x] With `expires-after`, a slot older than that is recorded as `expired`, not run; a one-time routine then switches itself off
- [x] A catch-up run covers several missed occurrences once; its `start` records them as one `missed` entry with `from`, `to` and `slots`
- [x] `loopboard routines due [path]` and `--under <dir>` print what's due, what is running, what expired or was aborted, and which routines have problems; `--json` prints the documented shape; `--dry-run` writes nothing
- [x] Spec § 15 gains the scenarios; Vitest covers a fresh routine, `created`, catch-up, expiry, a run younger and older than `timeout`, `host`, paused and invalid routines, nested harnesses under `--under`

## Out of scope

- How a `creates: issue` routine files its issue (#0118) — `due` calls it

## Notes

- PRD stories 7–11 and 19. "Now" is a parameter, so the tests set it.
