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
| Record the start of a run | ✅ | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): the entry, the printed commands, a second start refused. Lock, abort and dry run in `tests/dispatch.test.ts` |
| Finish a run with a note | ✅ | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): `--note -` from stdin, the block quote. Late finish and refusals in `tests/dispatch.test.ts` |
| A one-time routine switches itself off | ❌ | Vitest: `tests/dispatch.test.ts` |
| File the period's issue | ✅ | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): fields, due day, recurrence, a second start files nothing. Periods at their edges in `tests/recurrence.test.ts` |
| Two issues for one period are reported | ✅ | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts) |
| Check routines | 🟡 | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): a broken schedule fails, an unknown field warns. Every error and warning in `tests/routines.test.ts` |

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

### Scenario: Check routines

```
GIVEN routines in <root>/scheduled/
WHEN I run `loopboard check`
THEN a routine that can't run fails the check with ✗ and exit code 1, the
    file and the reason on one line: a folder without routine.md or
    frontmatter, neither or both of `schedule` and `at`, a cron expression
    that doesn't parse (the field and why) or never occurs, an `at` that
    isn't `YYYY-MM-DD HH:MM`, an unknown zone, a bad duration, `enabled`
    other than true or false, `creates` other than `issue`, a missing or
    unknown `period`, an `issue-` field outside its vocabulary, an
    `issue-due-after` that isn't whole days, a `writes-to` id that breaks
    the id rule
AND warnings (!) don't fail it unless --strict: an unknown field, a
    `writes-to` id that no registered harness answers to (by its workspace
    id, identity id or alias), an `issue-project` that doesn't exist, an
    `issue-` field without `creates: issue`, an entry of runs.md that can't
    be read
AND the closing line counts the valid routines:
    "✓ no duplicate numbers, 3 routines valid"
AND `routines list` shows a broken routine as "invalid" with the same lines
```

### Scenario: Record the start of a run

```
GIVEN a routine — its folder, or its slug with --path <repo>
WHEN I run `loopboard routines start <routine>`
THEN runs.md (created with a short header if it isn't there) ends with
    ## 2026-10-27 07:30 · running
    - started: 2026-10-27T07:30:04+01:00
    - slot: 2026-10-27T07:30:00+01:00
    - host: studio
AND `slot` names the occurrence it runs for when the routine is due;
    without one it is a manual run
AND it prints the brief and finish commands for the run
AND while a `running` entry of the routine is younger than its `timeout`
    (default 2h) a second start is refused with the start time and host;
    an older one is first recorded as `aborted`
AND a paused, pinned (another `host:`) or invalid routine isn't started
AND two starts at once record one run; --json prints the run, --dry-run
    writes nothing
```

### Scenario: Finish a run with a note

```
GIVEN a run in progress
WHEN I run `loopboard routines finish <routine> --status ok --note "…"`
    (or --status failed; `--note -` reads the note from stdin)
THEN runs.md gains the run's final entry with `started`, `finished`,
    `slot` and `host`, and the note as a block quote below
AND the run now reads as ok (or failed) everywhere; the running entry stays
    in the file above it
AND without a note, or without an open run, it is refused
AND a run that was recorded as aborted after its timeout can still be
    finished: the late result replaces it
```

### Scenario: A one-time routine switches itself off

```
GIVEN a routine with `at: 2026-11-03 09:00`
WHEN its run finishes
THEN routine.md gains `enabled: false`, and nothing else in it changes
AND it is never due again
```

### Scenario: File the period's issue

```
GIVEN a routine
    ---
    title: Monthly books
    schedule: "0 6 1 * *"
    creates: issue
    period: month
    issue-title: "Books for {previous}"
    issue-assignee: human
    issue-due-after: 9d
    ---
    Send the {previous} books to the accountant.
WHEN its slot on 1 January 2027 is due (or I run `loopboard routines start`)
THEN loopboard files the issue itself, without an agent: the next free
    number, "Books for 2026-12", the `issue-` fields, `due: 2027-01-10`,
    `recurrence: monthly-books@2027-01`, today as `created`, and the body
    with its placeholders filled in
AND the run is recorded as ok, its note naming the issue
AND `period` is day, week, month, quarter or year, labelled 2027-01-01,
    2026-W53 (ISO), 2027-01, 2027-Q1, 2027; `{period}` is the slot's period,
    `{previous}` the one before, `{date}` the slot's day
AND when an issue in issues/ or issues/_archive/ carries that recurrence
    already, nothing is filed and the run's note names it
AND after a gap the latest period is filed and the others are recorded as
    one `missed` entry — never back-filled
AND a run that can't file (an `issue-project` that's gone) is recorded as
    failed with the reason; --dry-run names the number it would take
```

### Scenario: Two issues for one period are reported

```
GIVEN two issues — live or archived — with the same `recurrence:` value,
    as two devices on one synced folder can file before the sync catches up
WHEN I run `loopboard check`
THEN it lists the value and both files, and fails
```

