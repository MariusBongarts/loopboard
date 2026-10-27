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
| Ask what is due | ✅ | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): run, filed, invalid, `--json`, `--dry-run`. Every state in `tests/dispatch.test.ts` |
| Missed slots are caught up once | ❌ | Vitest: `tests/dispatch.test.ts` (the `missed` entry, `created`) |
| A late slot expires | ❌ | Vitest: `tests/dispatch.test.ts` |
| A run that never finishes is aborted | ❌ | Vitest: `tests/dispatch.test.ts` |
| Record the start of a run | ✅ | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): the entry, the printed commands, a second start refused. Lock, abort and dry run in `tests/dispatch.test.ts` |
| Finish a run with a note | ✅ | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): `--note -` from stdin, the block quote. Late finish and refusals in `tests/dispatch.test.ts` |
| A one-time routine switches itself off | ❌ | Vitest: `tests/dispatch.test.ts` |
| File the period's issue | ✅ | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): fields, due day, recurrence, a second start files nothing. Periods at their edges in `tests/recurrence.test.ts` |
| Two issues for one period are reported | ✅ | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts) |
| Brief a run | 🟡 | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): steps, earlier notes, rules and finish command. Every part in `tests/brief.test.ts` |
| Print the dispatcher prompt | ✅ | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): one harness and `--under` |
| See routines on the board | ✅ | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): rail entry, rows, paused, issue routines |
| Open a routine | ✅ | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): settings, rendered steps, runs with notes newest first, a live update |
| See a year of runs as a graph | 🟡 | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): the workspace graph's cells, a failed and an ok day, the hover text, a routine's own graph. Day states in `tests/graph.test.ts`, layout in `tests/routineView.test.ts`; contrast in `pnpm verify` |
| A harness without routines | ✅ | [`15-routines.spec.ts`](../../tests/e2e/15-routines.spec.ts): no rail entry, ⌘K, the empty state |
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

### Scenario: Ask what is due

```
GIVEN routines in a harness, or in every harness under a folder
WHEN I (or a dispatcher) run `loopboard routines due [path]` or
    `routines due --under <dir>`
THEN it lists the agent routines to run now with their slot, the issues it
    filed itself (§ "File the period's issue"), the slots that expired, the
    runs it recorded as aborted, the runs still in progress and the routines
    that are invalid — or "Nothing is due."
AND a routine is due when it is enabled, valid, not pinned to another
    `host:`, nothing of it is running, and its slot — the latest occurrence
    up to now — is later than its newest run start or expired entry
AND paused routines and routines pinned to another machine aren't listed
AND --json prints `version: 1` with run, filed, expired, aborted, running
    and problems, each naming the harness, the routine's slug, folder and
    title (docs/routines.md)
AND --dry-run writes nothing and says so
```

### Scenario: Missed slots are caught up once

```
GIVEN an hourly routine whose last run was at 08:00, and a machine that
    slept until 12:10
WHEN `routines due` runs
THEN the routine is due once, for 12:00
AND its `start` records the 09:00, 10:00 and 11:00 slots as one `missed`
    entry (from, to, slots: 3) before its running entry
AND no slot before the day in `created:` counts, so a routine written on
    Wednesday for Mondays waits for next Monday
```

### Scenario: A late slot expires

```
GIVEN `expires-after: 6h` and a slot at 07:30
WHEN `routines due` runs at 15:02
THEN the slot is recorded as `expired` ("7h 32m after the slot; expires-after
    is 6h.") and not run
AND the routine is due again at its next slot; a one-time routine switches
    itself off
```

### Scenario: A run that never finishes is aborted

```
GIVEN a `running` entry older than the routine's `timeout`
WHEN `routines due` (or `start`) runs
THEN the run is recorded as `aborted` with a note, and the routine is
    evaluated again — due if a newer slot is waiting
AND a run younger than its timeout is listed as running and blocks the
    routine
```

### Scenario: Brief a run

```
GIVEN a routine with an open run
WHEN I run `loopboard routines prompt <routine>`
THEN it prints the brief for the run's sub-agent: the routine's title,
    schedule in words with its zone and the slot the run is for (or that
    it is manual), the working directory (the harness), the harness's id,
    name and the purpose paragraph of .agents/harness.md, the pointer to
    AGENTS.md, the steps, the notes of the last three finished or aborted
    runs newest first (or "This is the routine's first run."), the rules —
    write only to this harness and the `writes-to` harnesses (with their
    folders where they are registered), never commit, push or publish,
    never send anything unless a step says so, don't touch routine.md or
    runs.md, fail instead of faking, end with a short note — and the exact
    `finish` commands for ok and failed
AND for a `creates: issue` routine it says there is nothing for an agent to
    do and names `routines start`
```

### Scenario: Print the dispatcher prompt

```
GIVEN a harness, or a folder of harnesses
WHEN I run `loopboard routines dispatcher-prompt [path]` or
    `routines dispatcher-prompt --under <dir>`
THEN it prints docs/dispatcher-prompt.md with the scope filled in: run
    `routines due … --json`; handle `run` one after another, each with
    `start`, a sub-agent with fresh context in the harness and the brief,
    and a `finish` if the sub-agent didn't; a push notification per run
    and per failure where the platform can; never send anything else,
    never commit
AND docs/routines.md shows how to run it as a Claude Code scheduled task,
    with Codex and from cron with `claude -p`
```

### Scenario: See routines on the board

```
GIVEN a workspace whose harness has routines
WHEN I open it
THEN the rail lists "Routines" under Workspace with their number
AND /w/:ws/routines lists each routine: its title (with the slug, or its
    first problem), the schedule in words (with its zone when that isn't
    mine), the next slot — or "Due since …", "Running since …" — and the
    last run's status and time; a paused, invalid, pinned or due routine
    says so, and a `creates: issue` routine says it files an issue
AND on a narrow pane the schedule and next slot move under the title
AND nothing in the view writes: routines are edited as files, through the
    `routine` skill
```

### Scenario: Open a routine

```
GIVEN the Routines view
WHEN I click a routine (or pick it in ⌘K)
THEN /w/:ws/routines/:slug shows its schedule in words, its problems, its
    settings — schedule, zone, next slot, expires after, timeout, the
    machine it runs on, the harnesses it writes to, the issue it files,
    created, its folder —, its steps rendered as markdown, and every run
    newest first with status, time, slot, duration, host and note (the
    newest 30, then "Show all N runs")
AND a run recorded while the page is open appears without a reload
AND the back arrow returns to the list
```

### Scenario: A harness without routines

```
GIVEN a workspace whose harness has no routines
THEN the rail has no Routines entry
AND ⌘K "Go to Routines" opens the view, which says how to create one
```

### Scenario: See a year of runs as a graph

```
GIVEN routines with runs
WHEN I open the Routines view (or a routine's page)
THEN a graph of the last 12 months sits on top — every routine summed on
    the list, the routine alone on its page: 53 week columns of seven days,
    Monday on top, month names above, ending with today
AND a day is red when a run failed or was aborted, else green when runs
    finished — four shades, darker for busier days relative to the busiest
    —, else grey when a slot was missed or expired (recorded, or a past slot
    of an enabled routine since its `created` day, or its first entry, with
    no entry at all — so a dispatcher that stopped shows), else empty
AND days are each routine's local days
AND hovering or focusing a day shows its date and runs below the graph:
    time, status and the note's first line (with the routine's title on the
    list); the arrow keys, Home and End move through the days, and each day
    has a label like "Mon 26 Oct 2026: 2 ok, 1 failed"
AND a legend names the shades, Failed and Missed; the colors pass the
    contrast check at 3:1 in both themes
AND on a narrow pane the graph scrolls, starting at today
```

