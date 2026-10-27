---
id: 0114
title: See a harness's routines and their next slot with loopboard routines list
category: user-story
status: done
assignee: agent
project: 05-routines
phase: 1
labels: [cli, routines]
created: 2026-10-27
---

## User story

As a **maintainer**, I want **each routine to be a folder with a `routine.md`
in `.agents/scheduled/`, and `loopboard routines list` to show its schedule in
words, its next slot and its last run**, so that **I see what runs in a
harness, and when, without an agent platform**.

## Acceptance criteria

- [x] `routine.md` is read from its raw frontmatter lines (PRD "Files"): `title`, `schedule`, `at`, `timezone`, `enabled`, `expires-after`, `timeout`, `host`, `writes-to`, `created`, `creates` and the `issue-` fields; a folder starting with `_` or `.` is no routine
- [x] A shared cron module computes the next and the previous occurrence in an IANA zone — `*`, numbers, ranges, steps, lists, month and day names, `7` = Sunday, `L` in the day of month, the five `@` macros, day of month OR day of week — with the PRD's DST rules, and describes a schedule in words ("Weekdays at 07:30", "Every 15 minutes", "On the last day of every month at 18:00", "Once on 3 Nov 2026 at 09:00")
- [x] `runs.md` is parsed into runs and entries exactly as the PRD specifies; an unreadable entry is skipped
- [x] `loopboard routines [list] [path]` prints each routine with its schedule in words (and its zone when it has one), the next slot, and the last run's status and time; a paused routine says so; `--under <dir>` covers every harness under the folder, grouped by harness, skipping symlinks, hidden folders, `node_modules` and macOS packages
- [x] `--json` prints the documented `version: 1` shape: host, now, and per harness its id, name, path, root and routines with their fields, next slot, last run, runs and problems (the graph's days join in #0121)
- [x] `--help` lists the command; spec `15-routines.md` exists with its scenarios and E2E table, linked from `_specs.md`
- [x] Vitest: cron in UTC, `Europe/Berlin`, `America/New_York` and a half-hour zone across both DST changes, `L`, the 31st, 29 February, OR of the day fields, macros, invalid expressions with a reason, words; `list` and `--under` on real temp folders

## Out of scope

- Validation messages for broken routines beyond "invalid" (#0115)
- Writing `runs.md` (#0116) and deciding what's due (#0117)

## Notes

- PRD stories 1–6, 24 (CLI side) and 31. The cron module lives in `shared/`
  so the client can describe schedules too.
