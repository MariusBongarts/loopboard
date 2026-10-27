---
id: 0116
title: Record runs with routines start and finish
category: user-story
status: todo
assignee: agent
project: 05-routines
phase: 1
parent: 0114
labels: [cli, routines]
created: 2026-10-27
---

## User story

As a **dispatcher (and the maintainer reading after it)**, I want **`loopboard
routines start` to record that a run began and `finish` to record how it
ended with a short note, in the routine's `runs.md`**, so that **a second
start is refused while a run is in progress, and every run leaves a trace
the next one can read**.

## Acceptance criteria

- [ ] `start <routine>` (a folder path, or a slug with `--path`) appends a `running` entry with `started`, `slot` (when the routine is due) and `host`, creating `runs.md` with its header; it holds a file lock, so two starts at once record one run
- [ ] `start` refuses (exit 1, naming the start time and host) while a `running` entry of the routine is younger than its `timeout` (default 2h)
- [ ] `finish <routine> --status ok|failed --note <text>` appends the final entry with `started`, `finished`, `slot`, `host` and the note as a block quote; `--note -` reads stdin; without an open run it refuses; an `aborted` run that reports late is closed too
- [ ] A one-time routine (`at:`) gets `enabled: false` in `routine.md` when it finishes; nothing else in the file changes
- [ ] `--json` on `start` prints the run; `--dry-run` prints what would be written and writes nothing
- [ ] `routines list` shows the last run's status, time and note
- [ ] Spec § 15 gains the scenarios; Vitest covers the round trip of every status, a note with `##` lines, the lock, the timeout refusal, the late finish and the one-time switch-off

## Out of scope

- Turning stale runs into `aborted` and catching up missed slots (#0117)

## Notes

- PRD "runs.md", "Double starts", stories 9, 10, 12 and 14.
