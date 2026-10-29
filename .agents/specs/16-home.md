# 16. Home

> Each workspace's overview of what happened lately: routine runs with what
> they filed and mentioned, project sessions and issues filed by hand, as a
> timeline, with the health of every routine, what needs you and the latest
> projects beside it. Everything on Home opens a **preview** with its own
> link (project [06](../projects/06-home-timeline/prd.md)).

## E2E coverage

[`16-home.spec.ts`](../../tests/e2e/16-home.spec.ts) runs the built binary
against a temp harness with routines and runs. Every timeline rule —
grouping, the run summary, filed versus mentioned, the collapse rule, health
rows, what is new — is unit-tested in `tests/home.test.ts`. Status legend in
[`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Open Home | ✅ | [`16-home.spec.ts`](../../tests/e2e/16-home.spec.ts): a workspace opens on Home, ⌘K "Go to Home", the `H` key; the last-used redirect in [`07-workspaces.spec.ts`](../../tests/e2e/07-workspaces.spec.ts) |
| Runs on the timeline | ✅ | [`16-home.spec.ts`](../../tests/e2e/16-home.spec.ts): day groups, summary, failed tag, a quiet run on one line. Summary rules in `tests/home.test.ts` |
| What a run filed and mentioned | ✅ | [`16-home.spec.ts`](../../tests/e2e/16-home.spec.ts): filed under the run, mentions as chips, an issue routine's issue by `recurrence`, a hand-filed issue on its own |
| Choose the period | ✅ | [`16-home.spec.ts`](../../tests/e2e/16-home.spec.ts): Today hides yesterday, remembered after a reload |
| Routine health, Needs you and projects | 🟡 | [`16-home.spec.ts`](../../tests/e2e/16-home.spec.ts): a row per routine with its run strip. Paused, running, no runs, Needs you order and projects in `tests/home.test.ts` |
| What is new since the last visit | ❌ | Vitest: `tests/home.test.ts` (runs after last seen, later days, the 24-hour default, the count) |
| Preview a run | ✅ | [`16-home.spec.ts`](../../tests/e2e/16-home.spec.ts): by click, the URL, issues from the run, its place in the strip |
| Preview an issue, a project or a routine | 🟡 | [`16-home.spec.ts`](../../tests/e2e/16-home.spec.ts): an issue by link after a reload, "Filed by a routine". Project and routine previews not asserted |
| Move between previews | ✅ | [`16-home.spec.ts`](../../tests/e2e/16-home.spec.ts): run → issue → Back → Esc, Close |
| Hover an issue | ✅ | [`16-home.spec.ts`](../../tests/e2e/16-home.spec.ts) |
| Home follows file changes | ✅ | [`16-home.spec.ts`](../../tests/e2e/16-home.spec.ts): a run appended to `runs.md` shows up |

### Scenario: Open Home

```
GIVEN a workspace
WHEN I open it — from /, a bookmark, the switcher or `loopboard` in a
    terminal — or click Home at the top of the rail, run "Go to Home" in ⌘K
    or press H
THEN /w/<ws> shows Home; the older /w/<ws>/home redirects there
AND the rail's Home entry carries the number of items new since my last
    visit, when there are any
```

### Scenario: Runs on the timeline

```
GIVEN routines with runs in the last 7 days
WHEN I open Home
THEN the runs are grouped under day headers ("Today", "Yesterday",
    "Tue, 27 Oct"), newest first, by the date and time runs.md wrote
AND each run shows its time, its routine, a status tag unless it is ok,
    and its run summary: the note's first line — joined with the next line
    when the first is shorter than 40 characters — clipped near 170
    characters; a run still running without a note says "Running since
    HH:MM"
AND a run that is ok and filed and mentions nothing, or a `creates: issue`
    run that filed nothing, takes one line with its summary inline
```

### Scenario: What a run filed and mentioned

```
GIVEN a run whose note references #0002, created on the run's day, and
    #0001, created earlier
WHEN I look at it on Home
THEN #0002 is listed under the run as filed, with its status, title and
    project, and #0001 is a dashed chip under "Mentions"
AND #0002 doesn't appear again as its own entry on the timeline
AND an issue a `creates: issue` routine filed counts as filed by its run
    through `recurrence: <slug>@<period>`, whether or not the note names it
AND project sessions and live issues filed in the period are entries too:
    on one day runs come first, then sessions, then issues
AND archived issues never show
```

### Scenario: Choose the period

```
GIVEN Home
WHEN I choose Today, 7 days or 30 days
THEN the timeline shows that period, starting at midnight of the first day
AND the choice is remembered in this browser
AND with nothing in the period Home says so; a harness without routines
    is told how to create one
```

### Scenario: Routine health, Needs you and projects

```
GIVEN Home
THEN beside the timeline (above it in a narrow window) every routine has a
    row: a dot for its last run (an open ring when paused or never run),
    its title, a strip of its last ten runs, its next slot or "Paused",
    and when it last ran
AND "Needs you" lists the first five issues assigned to me and still
    open, reviews first, with a link to the Needs you view
AND "Projects" lists the four projects not shipped with the latest
    sessions
```

### Scenario: What is new since the last visit

```
GIVEN I marked Home seen yesterday at 18:00
WHEN I open Home
THEN runs after that moment, and sessions and issues of a later day, carry
    a dot, and so does the count in the rail
WHEN I click "Mark all seen"
THEN the dots and the count go away, for this workspace in this browser
AND before I ever marked Home seen, the last 24 hours count as new
```

### Scenario: Preview a run

```
GIVEN a run on Home
WHEN I click it
THEN a dialog shows its summary, status, times, duration and host, the
    issues it filed and mentioned, and the rest of its note with `#NNNN`
    links
AND the URL gains `?peek=run/<slug>/<YYYY-MM-DDTHHMM>`, so a reload or the
    link opens the same preview
AND Older and Newer step through the routine's runs, and a strip shows
    where this run sits
AND "Copy link" copies the URL; "Open in board" opens the routine's page
```

### Scenario: Preview an issue, a project or a routine

```
GIVEN an issue, a project or a routine on Home
WHEN I click it
THEN `?peek=issue/<id>` shows the issue — editable as in the issue panel —
    under the run that filed it and the runs that mention it
AND `?peek=project/<slug>` shows its focus, open issues and latest
    sessions; "Open in board" opens its board
AND `?peek=routine/<slug>` shows its schedule, next slot and recent runs
AND a link to something that no longer exists says so
```

### Scenario: Move between previews

```
GIVEN a run preview
WHEN I click an issue in it
THEN the issue's preview replaces it and a Back button appears
WHEN I click Back (or the browser's back)
THEN the run preview returns
AND Esc, the close button or a click outside closes the preview and leaves
    Home where it was
```

### Scenario: Hover an issue

```
GIVEN an issue link on Home or in a preview
WHEN I rest the pointer on it
THEN after a moment a card shows its status, assignee, project, title and
    the start of its description
AND it never shows on touch, and goes away when the pointer leaves
```

### Scenario: Home follows file changes

```
GIVEN Home is open
WHEN a run is appended to a routine's runs.md, or an issue is filed
THEN it shows on Home without a reload
```

## How to update this spec

Change a scenario together with its row in the coverage table and the test
it names. Rules that decide what Home shows live in `src/home.ts`; change
them there with `tests/home.test.ts`.
