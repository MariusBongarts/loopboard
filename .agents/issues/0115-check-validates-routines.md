---
id: 0115
title: loopboard check validates routines
category: user-story
status: todo
assignee: agent
project: 05-routines
phase: 1
parent: 0114
labels: [cli, routines, check]
created: 2026-10-27
---

## User story

As a **maintainer**, I want **`loopboard check` to say what is wrong with a
routine**, so that **a routine with a typo in its schedule doesn't silently
never run**.

## Acceptance criteria

- [ ] Errors (✗, exit 1): a routine folder without `routine.md` or frontmatter; neither or both of `schedule` and `at`; a cron expression that doesn't parse, with the field and the reason; an `at` that isn't `YYYY-MM-DD HH:MM`; an unknown time zone; a duration that isn't `30m`/`6h`/`2d`; `enabled` other than true or false; `creates` other than `issue`; for `creates: issue` a missing or unknown `period`, an unknown `issue-category`/`issue-status`/`issue-assignee`, an `issue-due-after` that isn't whole days; a `writes-to` id that breaks ADR-0008
- [ ] Warnings (!, exit 1 only with `--strict`): an unknown field; a `writes-to` id that is no registered workspace's id, identity id or alias; an `issue-project` that doesn't exist; an entry of `runs.md` that can't be read
- [ ] Every line names the file relative to the root, like the other `check` lines; a valid harness adds the number of routines to the closing "✓" line
- [ ] `routines list` shows an invalid routine with its first problem and never as due
- [ ] Spec § 10 and § 15 gain the scenario; Vitest covers each error and warning

## Out of scope

- Duplicate `recurrence:` values (#0118)

## Notes

- PRD "Commands" (`check`) and story 3. The registered names come from the
  registry and each workspace's identity file, as `init` collects them.
