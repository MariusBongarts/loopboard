---
id: 0140
title: A routine always runs in the machine's zone
category: task
status: done
assignee: agent
parent: 0137
labels: [routines]
created: 2026-11-03
---

## What

Remove `timezone:` from `routine.md`. Every schedule is the machine's local time and follows its zone.

## Why

Marius' decision on 2026-11-03, after #0137: "Always use the timezone of the machine". One clock for all routines, and #0137's rule applies to all of them.

## Acceptance criteria

- [x] A routine's zone is always `systemTimeZone()`; #0137's local-time test applies to every routine
- [x] A leftover `timezone:` line is ignored and `loopboard check` warns about it; a bad zone name no longer invalidates a routine
- [x] `list` and the board no longer add a zone to the schedule in words
- [x] The field is gone from the docs, spec, READMEs, templates (both copies) and the `routine` skill
- [x] Migration M005, marker moved
- [x] Tests pin the machine's zone with `TZ`; E2E runs in UTC
- [ ] `pnpm verify` green: blocked only by the date-dependent `tests/routines.test.ts` "prints the documented JSON shape", which also fails without this change. `tests/e2e/15-routines.spec.ts` "write a routine and list the routines of a harness" fails on the same `state: 'idle'` assertion, and the other 11 tests in the routine and Home specs pass

## Out of scope

- The `timezone` field in `list --json` and `due --json` stays, with the machine's zone as its value: the JSON contract keeps version 1, and the board reads it
- Project 05's PRD keeps its original field table as history

## Memory

- **Leftover line is a warning, not an error.** A routine that kept `timezone:` keeps running, on the machine's clock. If its zone differed from the machine's, its real time moves, so M005 asks before removing the line. None of the routines looked at on this machine set it (`~/repos/*/.agents/scheduled`, `~/leben/.agents/scheduled`); only templates and READMEs did.
- **Tests:** `vi.stubEnv('TZ', …)` switches the zone mid-test, because Node re-reads it when `process.env.TZ` is set.
