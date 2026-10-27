# Routines

A routine is recurring or one-time work a harness carries itself: a weekly
report, an hourly mail check, a reminder on Friday, the duty to file the
month's bookkeeping issue. It lives in the harness as files, not as a task
of one agent platform, and one **dispatcher** per place runs whatever is
due ([ADR-0010](https://github.com/MariusBongarts/loopboard/blob/main/.agents/architecture/decisions/0010-routines-run-by-a-dispatcher-outside-loopboard.md)).
loopboard reads, checks and shows routines, decides what is due and records
runs. It never starts an agent and has no timer.

Ask your agent to "create a routine that …": the `routine` skill writes it
(a docs harness follows `.agents/scheduled/README.md` instead). Never let
an agent create a scheduled task of its platform for it — the AGENTS.md
block says so.

## A routine

One folder per routine:

```text
.agents/scheduled/
├─ _templates/routine.md   the template a new routine starts from
└─ weekly-report/
   ├─ routine.md           when and what — edited by people and the skill
   ├─ runs.md              every run — written by `loopboard routines` only
   └─ …                    anything the steps use
```

`routine.md` holds the schedule and settings in its frontmatter and the
steps in its body. Fields are read line by line, not as YAML, so
`schedule: */15 * * * *` works unquoted — quote it anyway for other tools.

| Field | Value | Default |
|---|---|---|
| `title` | display name | the folder's name |
| `schedule` | five-field cron: minute, hour, day of month, month, day of week. `*`, numbers, ranges `1-5`, steps `*/15`, lists `1,15`, names `MON`/`JAN`, `7` = Sunday, `L` in the day of month = its last day; `@hourly`, `@daily`, `@weekly`, `@monthly`, `@yearly` | — |
| `at` | one time instead of `schedule`: `YYYY-MM-DD HH:MM`; switches itself off (`enabled: false`) after its run | — |
| `timezone` | an IANA zone, `Europe/Berlin` | the machine's zone |
| `enabled` | `false` pauses it | `true` |
| `expires-after` | `30m`, `6h`, `2d`, `1h30m`: a slot older than this is recorded as expired, not run | none |
| `timeout` | a run older than this without `finish` counts as aborted | `2h` |
| `host` | the one machine that runs it (as `loopboard routines` names it) | any |
| `writes-to` | other harnesses a run may write to, by id: `[leben, steuern]` | none |
| `created` | `YYYY-MM-DD`; no slot before this day counts | none |
| `creates` | `issue`: the routine only files the period's issue | none |

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

Day of month and day of week are ORed when both are restricted, as in
cron. On the day the clocks go forward, a local time that doesn't exist
runs once, an hour later (02:30 → 03:30); on the day they go back, a time
that happens twice runs once, the first time.

### Recurring issues

A routine with `creates: issue` needs no agent: when its slot is due,
loopboard files the period's issue itself, with the next free number.

| Field | Value | Default |
|---|---|---|
| `period` | `day`, `week` (ISO), `month`, `quarter` or `year` — labelled `2026-11-03`, `2026-W45`, `2026-11`, `2026-Q4`, `2026` | required |
| `issue-title` | pattern with `{period}`, `{previous}` (the period before) and `{date}` (the slot's day) | `<title> {period}` |
| `issue-category`, `issue-status`, `issue-assignee` | the issue vocabularies | `task`, `todo`, `agent` |
| `issue-labels` | `[a, b]` | `[]` |
| `issue-project` | `NN-slug` of an existing project | none |
| `issue-due-after` | whole days after the slot, `10d`: the issue's `due:` | none |

The body, with the placeholders filled in, becomes the issue's body, and
the issue gets `recurrence: <slug>@<period>`. An issue with that value —
live or archived — means the period is done: nothing is filed twice.
`loopboard check` reports two issues with the same value, which two devices
on one synced folder can create.

## When a routine runs

A routine is **due** when it is enabled, valid, not pinned to another
`host`, nothing of it is running, and its **slot** — the latest occurrence
up to now, counting from its `created` day — is later than its newest run
start or expired entry.

- **Missed slots run once.** After a night off, an hourly routine runs once
  for the latest slot; that run records the others as one `missed` entry.
- **Late slots can expire.** With `expires-after: 6h`, a slot noticed seven
  hours late is recorded as `expired` instead of run.
- **A run blocks a second start** while its `running` entry is younger than
  `timeout`. An older one is recorded as `aborted`, and the routine can run
  again. `host:` pins a routine to one machine — on a folder synced between
  machines, plain files can't lock across them.

## runs.md

Append-only, newest last, one entry per event; written only by `due`,
`start` and `finish`. It is versioned like any file — no run commits.

```markdown
## 2026-10-26 07:30 · running
- started: 2026-10-26T07:30:04+01:00
- slot: 2026-10-26T07:30:00+01:00
- host: studio

## 2026-10-26 07:30 · ok
- started: 2026-10-26T07:30:04+01:00
- finished: 2026-10-26T07:41:15+01:00
- slot: 2026-10-26T07:30:00+01:00
- host: studio

> Wrote reports/2026-10-26.md. Nothing stands out.
> Next run: the baseline is set now.
```

An entry is `## <local time> · <status>`, then `- key: value` lines, then
the note as a block quote. Times are ISO 8601 with the routine's offset.
The entries of one run share `started`; its last entry is its state:
`running`, `ok`, `failed` or `aborted`. `expired` (`recorded`, `slot`) and
`missed` (`recorded`, `from`, `to`, `slots`) record slots that weren't run.

## Commands

`<routine>` is a routine's folder, or its slug in the harness at
`--path <repo>`. `[path]` is a harness (default: here); `--under <dir>`
covers every harness under a folder instead — no symlinks, hidden folders,
`node_modules` or macOS packages. A command that writes takes `--dry-run`,
which reports and writes nothing.

| Command | Does |
|---|---|
| `loopboard routines [list] [path]` | Each routine with its schedule in words, next slot and last run; `--under <dir>`, `--json` |
| `loopboard routines due [path]` | What is due now; files the period's issues, records expired slots and aborted runs; `--under <dir>`, `--json`, `--dry-run` |
| `loopboard routines start <routine>` | Records the start of a run, or files a `creates: issue` routine's issue; `--json`, `--dry-run` |
| `loopboard routines finish <routine> --status ok\|failed --note <text>` | Records how the run ended; `--note -` reads the note from stdin |
| `loopboard routines prompt <routine>` | The brief for the run's sub-agent: steps, harness, last three notes, rules, the finish command |
| `loopboard routines dispatcher-prompt [path]` | The dispatcher prompt for this harness or `--under <dir>` |
| `loopboard check` | Also validates every routine and finds duplicate `recurrence:` values |

The board shows the same under **Routines** in each workspace: every
routine, a page per routine with its steps and runs, and a graph of the
last 12 months.

## Set up a dispatcher

One dispatcher per place: one for each code repo, one for a folder of
document harnesses. It is the only scheduled task your agent platform keeps.
Print its prompt with the scope filled in:

```bash
loopboard routines dispatcher-prompt ~/repos/shop
```

```bash
loopboard routines dispatcher-prompt --under ~/leben
```

The prompt ([docs/dispatcher-prompt.md](https://github.com/MariusBongarts/loopboard/blob/main/docs/dispatcher-prompt.md)) asks
`loopboard routines due --json` what is due, starts each routine in its own
sub-agent with fresh context and the harness as working directory, makes
sure every run ends with `finish`, and sends a push notification per run
where the platform can. It never sends anything else, and no run commits.

**Claude Code.** Create one scheduled task in the Claude Code desktop app
that runs every hour, in the place's folder, with the dispatcher prompt as
its prompt. Allow the tools its routines need — they run unattended.

**Codex.** Run the prompt non-interactively with `codex exec`, with the
place as working directory and the permissions its routines need (see
`codex exec --help`), on a schedule like the cron line below.

**cron with `claude -p`.** Any machine with cron (or launchd) and Claude
Code. cron's `PATH` is short — give it the folder that holds `node`,
`loopboard` and `claude`:

```cron
PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
0 * * * * cd "$HOME/repos/shop" && loopboard routines dispatcher-prompt . | claude -p --permission-mode acceptEdits >> "$HOME/.loopboard-dispatcher.log" 2>&1
```

Check the setup by hand first: `loopboard routines due --dry-run` says what
the dispatcher would run, and writes nothing.

## For other tools: the JSON

`routines list --json`, `routines due --json` and `routines start --json`
are a contract for dashboards and scripts. Each carries `"version": 1`;
within a version, fields are only ever added. Times are ISO 8601 strings
with an offset; `null` means "none".

### `routines list --json`

#### List

| Field | Value |
|---|---|
| `version` | `1` |
| `host` | this machine's name, as `host:` matches it |
| `now` | when the list was made |
| `harnesses` | one entry per harness |

#### Harness

| Field | Value |
|---|---|
| `id` | the identity file's id, else the folder's slug |
| `name` | the identity file's name, else the folder's name |
| `path` | the harness folder |
| `root` | its `.agents/` (or legacy `ai/`) folder |
| `routines` | its routines, by slug |

#### Routine

| Field | Value |
|---|---|
| `slug` | the folder's name |
| `dir` | the routine's folder |
| `title` | `title:`, else the slug |
| `kind` | `agent`, or `issue` for `creates: issue` |
| `enabled` | `false` when paused |
| `state` | `due`, `running`, `idle`, `paused`, `pinned` (another `host:`), `expired` (its slot expired, not yet recorded) or `invalid` |
| `schedule` | the cron expression, or `null` |
| `at` | the one-time `at:`, or `null` |
| `timezone` | the zone its times are in |
| `words` | the schedule in words |
| `expiresAfter` | `expires-after:`, or `null` |
| `timeout` | `timeout:`, default `2h` |
| `host` | `host:`, or `null` |
| `writesTo` | `writes-to:` ids |
| `created` | `created:`, or `null` |
| `creates` | for `creates: issue`: `{ period, title, category, status, assignee, labels, project, dueAfter }`; else `null` |
| `next` | the next slot, or `null` when paused, invalid or done |
| `slot` | the slot that is due or expired now, or `null` |
| `lastRun` | the newest run (not an expired or missed entry), or `null` |
| `runs` | every run and slot entry, oldest first |
| `days` | the contribution graph's days with something on them |
| `problems` | `[{ level, file, message }]`: `level` is `error` or `warning`, `file` is `routine.md` or `runs.md` |
| `body` | the steps, as markdown |

#### Run

| Field | Value |
|---|---|
| `status` | `running`, `ok`, `failed`, `aborted`, `expired` or `missed` |
| `at` | `started` for a run, `recorded` for expired and missed |
| `started` | when the run began — its identity |
| `finished` | when it ended (or was aborted) |
| `slot` | the occurrence it was for; none for a manual run |
| `host` | the machine that ran it |
| `recorded` | when an expired or missed entry was written |
| `from` | the first missed slot |
| `to` | the last missed slot |
| `slots` | how many slots were missed |
| `note` | the note, as markdown; may be empty |

Fields a run doesn't have are left out.

#### Graph day

| Field | Value |
|---|---|
| `date` | `YYYY-MM-DD`, the routine's local day, within the last 53 weeks |
| `state` | `failed` (a run failed or was aborted), `ok` (runs finished) or `missed` (a slot was missed or expired, recorded or computed) |
| `ok` | finished runs that day |
| `failed` | failed or aborted runs |
| `missed` | missed or expired slots |
| `level` | `1`–`4` for an ok day, relative to the routine's busiest day; `0` otherwise |

### `routines due --json`

#### Due

| Field | Value |
|---|---|
| `version` | `1` |
| `host` | this machine's name |
| `now` | when it ran |
| `dryRun` | `true` with `--dry-run` |
| `run` | agent routines to run now: each entry plus `slot` and `missed` (how many earlier slots the run covers) |
| `filed` | `creates: issue` routines it ran: plus `slot`, `status` (`ok` or `failed`), `issue` (`{ id, file, title, period, recurrence, existing }`, or `null` when filing failed) and `note` |
| `expired` | slots recorded as expired: plus `slot` and `late` (`7h 32m`) |
| `aborted` | runs recorded as aborted: plus `started` and `host` |
| `running` | runs still in progress: plus `started` and `host` |
| `problems` | invalid routines: plus `problems` (their errors) |

#### Due entry

| Field | Value |
|---|---|
| `harness` | `{ id, name, path }` |
| `slug` | the routine's slug |
| `dir` | its folder — pass it to `start`, `prompt` and `finish` |
| `title` | its title |

### `routines start --json`

`{ version, action, dryRun, dir, run, slot, missed, aborted }`, and `issue`
(as in `due`'s `filed`) for a `creates: issue` routine. `action` is
`started`, or `filed` when the routine filed its issue; `run` is the run as
above; `slot` is the slot it runs for, or `null` for a manual run; `missed`
counts the earlier slots it covers; `aborted` is the stale run it closed
first, or `null`.
