---
id: 0137
title: A routine's slot comes due twice when the machine's zone moves west
category: bug
status: done
assignee: agent
labels: [routines]
created: 2026-11-03
---

## Steps to reproduce

1. A routine with `schedule: "0 8 * * *"` and no `timezone:` starts at 08:46 +08:00 for its 08:00 slot.
2. During the run the machine's zone moves to +07:00; the run finishes at 07:55 +07:00.
3. `loopboard routines due` runs at 08:13 +07:00.

## Current behavior

The routine is due again: 08:00 +07:00 is an hour after 08:00 +08:00, and `evaluate` compared instants. It happened on 2026-11-02 with webhighlights' `backlink-opportunities`, which ran twice (webhighlights#1320 guards its paid lanes meanwhile).

## Expected behavior

A local time runs once, however the machine's zone moves. Same rule as a time that happens twice when the clocks go back.

## Acceptance criteria (verification)

- [x] A westward move during a run isn't due again (`tests/dispatch.test.ts`)
- [x] The next day's slot is still due after it, with nothing missed
- [x] An eastward move neither repeats a slot nor loses the next one
- [x] An hourly routine crossing a move behaves as described in Memory
- [x] A routine with a fixed `timezone:` behaves as before
- [x] An expired slot isn't repeated either
- [x] `pnpm verify`: types, contrast and 541 of 542 tests pass. The one failure, `tests/routines.test.ts` "prints the documented JSON shape", fails without this change too: it reads the real clock against a run from 2026-10-26 and has been due since the slot of 2026-11-02

## Out of scope

- Runs already in `runs.md` aren't rewritten; a repeated run stays on record
- The contribution graph buckets by the current zone's days; a run near midnight can land on another day after a move

## Memory

- **The rule.** Only for a routine without `timezone:`: a slot is handled when its instant is at or before the newest run start or expiry record (as before), *or* its local time is at or before that record's local time, read from the ISO string without its offset. `missed` applies the same test, since `occurrencesBetween` from the last handled instant would otherwise list the repeated local time.
- **Why the newest local time, not the same slot.** A catch-up run records one `slot`; the slots it covered are only a `from`/`to` range. Matching exact slots would run those again after a move west.
- **Hourly, moving west.** The local hours that come back don't run again: the next run is the first local hour after the newest recorded start. One zone west, run at 08:46 +08:00: 08:00 +07:00 is skipped and 09:00 +07:00 runs, two real hours after the last slot, with nothing missed. N zones west leaves about N+1 real hours between runs, so 7 hours west means a quiet 8 hours. Accepted: the cost of one rule for every schedule, and most long moves are flights.
- **Hourly, moving east.** Stays on the hour in real time: the instant test holds. Two zones east after the 08:00 +07:00 run, 10:00 +09:00 is the same moment and doesn't run; 11:00 +09:00 does, with nothing missed. Local hours jumped over aren't missed.
- **Daily, moving east.** The instant test can hide a slot only if the newest run started after that slot's moment: a run at 23:00 in Los Angeles hides 08:00 the next day in Tokyo. The slot after it runs normally. Same as before this fix.
- **Fixed `timezone:`.** Stays on instants. Its offset only differs for daylight saving, whose doubled time already has one occurrence, or after someone edits the field.
- **Tests** pin the machine's zone with a `vi.mock` of `systemTimeZone` in `shared/cron`.
