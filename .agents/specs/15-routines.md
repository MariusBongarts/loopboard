# 15. Routines

> Recurring and one-time work a harness carries itself, in
> `<root>/scheduled/<slug>/`: `routine.md` says when and what, `runs.md`
> records every run. loopboard reads, checks and shows routines, decides what
> is due and records runs; a dispatcher that an agent platform runs on a
> fixed beat starts them
> ([ADR-0010](../architecture/decisions/0010-routines-run-by-a-dispatcher-outside-loopboard.md)).

## E2E coverage

CLI behavior: [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts)
runs the built binary against temp harnesses; schedules, due and runs in
detail in `tests/cron.test.ts` and `tests/routines.test.ts`. Status legend in
[`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Write a routine | 🟡 | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): fields and defaults through `list --json`. Every field and the raw-line reading in `tests/routines.test.ts` |
| List the routines of a harness | ✅ | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): words, zone, next slot, last run, paused, invalid |
| List the routines under a folder | ✅ | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): nested harnesses; skipped folders in `tests/routines.test.ts` |
| A schedule keeps its local time across daylight saving | ❌ | Vitest: `tests/cron.test.ts` (Berlin, New York, Kolkata, Lord Howe) |

### Scenario: Write a routine

```
GIVEN a folder <root>/scheduled/weekly-report/ with routine.md:
    ---
    title: Weekly report
    schedule: "30 7 * * 1"
    timezone: Europe/Berlin
    expires-after: 6h
    ---
    Write the weekly report to reports/.
WHEN loopboard reads it
THEN its schedule is "Mondays at 07:30" in Berlin time, a slot may start
    up to 6h late, and the body is its steps
AND left-out fields take their defaults: the title is the folder's name,
    the zone is the machine's, `enabled: true`, `timeout: 2h`
AND a schedule is five-field cron (`*`, numbers, ranges, steps, lists,
    `MON`/`JAN`, `7` = Sunday, `L` = the last day of the month, @hourly,
    @daily, @weekly, @monthly, @yearly) or a one-time `at: 2026-11-03 09:00`
AND fields are read from their lines, so `schedule: */15 * * * *` works
    unquoted
AND a folder starting with `_` or `.` is no routine
```

### Scenario: List the routines of a harness

```
GIVEN a harness with routines
WHEN I run `loopboard routines` (or `routines list [path]`)
THEN each routine is a row with its slug, its schedule in words — with its
    zone when that isn't the machine's —, its next slot and its last run's
    status and time, times in the routine's zone ("today 15:00",
    "Mon 2 Nov 07:30")
AND a paused routine says "paused", a routine that is running says since
    when, and an invalid one says "invalid" with each problem below it
AND the last line names this machine as `host:` matches it
AND with --json it prints `version: 1`, the host, the time and, per
    harness, its id, name, path, root and routines with every field, the
    next slot, the last run, all runs and the problems (docs/routines.md)
```

### Scenario: List the routines under a folder

```
GIVEN a folder holding several harnesses, some nested in others
WHEN I run `loopboard routines --under <dir>`
THEN every harness under it, the folder itself included, is listed with
    its name and path and its routines below
AND symlinks, hidden folders, node_modules and macOS packages (*.app,
    *.sparsebundle, …) are not entered
AND naming a harness and --under together is refused
```

### Scenario: A schedule keeps its local time across daylight saving

```
GIVEN `schedule: "30 7 * * *"` and `timezone: Europe/Berlin`
WHEN the clocks change
THEN it runs at 07:30 Berlin time before and after
AND a time the clocks skip (02:30 on the last Sunday of March) runs once, an
    hour later
AND a time that happens twice (02:30 on the last Sunday of October) runs
    once, the first time
```
