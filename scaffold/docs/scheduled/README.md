# Routines

Work that comes back on a schedule or happens at a set time — a weekly
report, an hourly check, a reminder on Friday, the monthly duty to file an
issue — is a **routine**: a folder here that this harness carries itself.
One **dispatcher** per place runs whatever is due; loopboard decides what is
due and records each run, and never starts an agent itself
([docs/routines.md](https://github.com/MariusBongarts/loopboard/blob/main/docs/routines.md)).

To create one, copy [`_templates/routine.md`](_templates/routine.md) into
a new folder, fill it in and run `loopboard check`; `enabled: false` pauses
it. **Never create a scheduled task of an agent platform instead** — the
dispatcher is the only one per place.

## Folder shape

```text
scheduled/
├─ _templates/routine.md   the template a new routine starts from
└─ <slug>/
   ├─ routine.md           when and what — edited by people and agents
   ├─ runs.md              every run — written by `loopboard routines` only
   └─ …                    anything the steps use: templates, checklists
```

A folder starting with `_` or `.` is no routine. The slug is kebab-case.

## routine.md

Frontmatter says when and how; the body is the steps, written for an agent
that knows nothing but this harness. Fields are read line by line — quote a
cron expression, since YAML reads a leading `*` as something else.

| Field | Value | Default |
|---|---|---|
| `title` | display name | the slug |
| `schedule` | five-field cron in quotes: minute, hour, day of month, month, day of week; `L` in the day of month is its last day; `@hourly`, `@daily`, `@weekly`, `@monthly`, `@yearly` | — |
| `at` | one time instead: `YYYY-MM-DD HH:MM`; the routine switches itself off after its run | — |
| `timezone` | an IANA zone, `Europe/Berlin` | the machine's zone |
| `enabled` | `false` pauses it | `true` |
| `expires-after` | `30m`, `6h`, `2d`: a slot older than this is recorded as expired instead of run | none |
| `timeout` | a run older than this counts as aborted | `2h` |
| `host` | the one machine that runs it | any |
| `writes-to` | other harnesses a run may write to, by id: `[leben, steuern]` | none |
| `created` | `YYYY-MM-DD`; no slot before this day counts | none |
| `creates` | `issue`: the routine only files the period's issue — no agent | none |

A `creates: issue` routine adds `period` (`day`, `week`, `month`, `quarter`,
`year`), `issue-title` with `{period}`, `{previous}` and `{date}`,
`issue-category`, `issue-status`, `issue-assignee`, `issue-labels`,
`issue-project` and `issue-due-after` (`10d`); its body becomes the issue's
body. The issue gets `recurrence: <slug>@<period>`, so each period's issue
is filed once.

```markdown
---
title: Weekly report
schedule: "30 7 * * 1"
timezone: Europe/Berlin
expires-after: 6h
created: 2026-10-27
---

1. Read last week's merged pull requests.
2. Write reports/YYYY-MM-DD.md with what shipped and what is stuck.
```

## Schedules in words

| Words | `schedule` |
|---|---|
| every weekday at 07:30 | `"30 7 * * 1-5"` |
| every day at 18:00 | `"0 18 * * *"` |
| every hour / every 15 minutes | `"0 * * * *"` / `"*/15 * * * *"` |
| Mondays and Thursdays at 09:00 | `"0 9 * * 1,4"` |
| on the 1st of every month at 06:00 | `"0 6 1 * *"` |
| on the last day of every month at 17:00 | `"0 17 L * *"` |
| quarterly, on the 1st at 06:00 | `"0 6 1 1,4,7,10 *"` |
| once, on 3 Nov 2026 at 09:00 | `at: 2026-11-03 09:00` |

`loopboard routines` reads every schedule back in words with its next slot.

## How a routine runs

The dispatcher asks `loopboard routines due --json` what is due. A due slot
runs once, even after several were missed; a slot older than
`expires-after` is recorded as expired. Each run starts with
`loopboard routines start`, gets its brief from `loopboard routines prompt`
— the steps, this harness, the notes of the last three runs and the rules
below — and ends with
`loopboard routines finish <routine> --status ok|failed --note "…"`.
`runs.md` keeps every run; it is versioned like any file.

Every run:

- works in this harness and writes only to it and its `writes-to`
  harnesses, following their own rules;
- never commits, pushes or publishes;
- never sends anything — mail, chat, posts — unless its steps say so;
- leaves `routine.md` and `runs.md` alone;
- stops and fails instead of faking a result, and ends with a short note.

`loopboard check` says what is wrong with a routine.
