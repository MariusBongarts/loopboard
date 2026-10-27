# Routines — PRD

> Drafted: 2026-10-27
> Status: in-progress

## Problem statement

A maintainer who works with coding agents hands them more and more work that
comes back on a beat: a weekly report, an hourly mail check, a reminder on a
given day, the monthly duty to send the accountant the books. Today that work
lives as scheduled tasks inside one agent platform — a folder per task in the
platform's own config, outside the harness it belongs to. The harness doesn't
know what runs in its name, a second platform can't pick the tasks up, an
agent asked to "remind me on Friday" creates yet another platform task, and
nothing records what a run did so the next run can build on it. Recurring
duties that should simply become an issue each month (#0090) were planned as
a separate mechanism next to it.

## Solution

Every harness carries its own **routines** as files in
`.agents/scheduled/`: what should happen, when, and what the last runs did.
A single **dispatcher** per place — one per code repo, one for a tree of
document harnesses — is the only task an agent platform keeps. It runs on a
fixed beat, asks `loopboard routines due` what is due, and runs each routine
in a fresh sub-agent with a brief loopboard assembles from the routine, the
harness and the notes of the last runs. A routine that only has to file the
period's issue doesn't need an agent at all: loopboard files it itself.

loopboard defines the files, the commands, the checks, a read-only Routines
view with a GitHub-style graph of the runs, a skill that writes routines, and
the dispatcher prompt with setup examples for Claude Code, Codex and cron. It
never starts an agent and has no timer
([ADR-0010](../../architecture/decisions/0010-routines-run-by-a-dispatcher-outside-loopboard.md)).
Switching platforms means moving one dispatcher, not every task.

## User stories

**Routines as files**

1. As a **maintainer**, I want **each recurring task to be a folder in the harness it belongs to**, so that **the harness, not an agent platform, owns what runs in its name**.
2. As a **maintainer**, I want **a routine's schedule and settings in the frontmatter and its steps as plain markdown**, so that **I can read and edit it like any other file in the harness**.
3. As a **maintainer**, I want **schedules as five-field cron with a time zone**, so that **"weekdays at 07:30 Berlin time" means exactly that, across daylight saving changes**.
4. As a **maintainer**, I want **a one-time routine for a given date and time that switches itself off after its run**, so that **a reminder doesn't need a recurring schedule or a cleanup**.
5. As a **maintainer**, I want **to pause a routine with one field**, so that **it stops running without losing its steps or its history**.
6. As a **maintainer**, I want **extra files next to a routine (a template, a checklist)**, so that **its steps can refer to them**.

**When a routine is due**

7. As a **maintainer whose laptop was asleep**, I want **missed slots to be caught up once, not once per slot**, so that **an hourly routine doesn't run twelve times in a row after a night off**.
8. As a **maintainer**, I want **a routine to say how late it may still start**, so that **a morning brief that is six hours late is recorded as expired instead of arriving in the evening**.
9. As a **maintainer with two dispatchers on two machines**, I want **a run in progress to block a second start, and to be pinnable to one machine**, so that **the same routine doesn't run twice at once**.
10. As a **maintainer**, I want **a run that never reported back to count as aborted after a timeout**, so that **a crashed run doesn't block the routine forever**.
11. As a **maintainer**, I want **a new routine not to run for slots before the day I created it**, so that **creating a weekly routine on Wednesday doesn't trigger last Monday's run**.

**Runs and memory**

12. As a **maintainer**, I want **every run recorded in a file next to the routine, with its status and a short note**, so that **I can see what happened without opening a platform's logs**.
13. As an **agent running a routine**, I want **the notes of the last three runs in my brief**, so that **I know what the previous runs did and what they left for me**.
14. As a **maintainer**, I want **the run log versioned with git like any other file, and no run committing by itself**, so that **I decide what lands in the history and when**.

**Recurring issues** (supersedes #0090)

15. As a **maintainer with monthly, quarterly and yearly duties**, I want **a routine that files the period's issue with its due date**, so that **nobody has to remember to file it**.
16. As a **maintainer**, I want **filing the period's issue to happen once, however often the dispatcher asks, and not again after the issue was closed or archived**, so that **a duty never shows up twice**.
17. As a **maintainer on a synced folder**, I want **`loopboard check` to report two issues for the same duty and period**, so that **a double created by two devices before the sync caught up doesn't go unnoticed**.
18. As a **maintainer**, I want **the issue's title to name the period, or the period before it**, so that **"Books for October" can be filed on 1 November**.

**Dispatcher**

19. As a **maintainer**, I want **one command that lists what is due in this harness or in every harness under a folder**, so that **one dispatcher per place covers all of them**.
20. As a **maintainer**, I want **a ready dispatcher prompt and setup examples for Claude Code, Codex and cron**, so that **setting up the one platform task takes minutes and works on the platform I use**.
21. As a **maintainer**, I want **each routine to run in a fresh sub-agent with the harness as its working directory**, so that **routines don't share context or leak into each other's folders**.
22. As a **maintainer**, I want **runs never to send messages unless a routine's steps say so, and to write only to their own harness and the harnesses the routine names**, so that **an unattended run can't email someone or edit a folder it has no business in**.
23. As a **maintainer**, I want **a push notification per run where the dispatcher's platform supports it**, so that **I hear about a failed run without opening anything**.

**Board**

24. As a **maintainer**, I want **a Routines view per workspace listing each routine with its schedule in words, its next slot and its last run**, so that **I see at a glance what runs and whether it worked**.
25. As a **maintainer**, I want **a routine's page with its steps and every run with its note**, so that **I can follow what it did over time**.
26. As a **maintainer**, I want **a contribution graph per routine and one for the whole workspace — a cell per day for a year, green for runs, red for failures, grey for missed or expired slots**, so that **gaps and failures stand out**.
27. As a **maintainer**, I want **to hover a day and see the runs' times and notes**, so that **I don't have to open the log for one bad day**.

**Agents and setup**

28. As a **maintainer**, I want **my agent to write recurring work and reminders as routines, never as tasks of its platform**, so that **"remind me on Friday" ends up in the harness**.
29. As a **maintainer**, I want **a skill that turns "weekdays at 07:30" into a routine, asks for its steps, expiry and the harnesses it may write to, and checks the result**, so that **I never write cron by hand**.
30. As a **maintainer of running harnesses**, I want **`loopboard init --upgrade` and a migration to bring the folder, the skill and the rule**, so that **existing harnesses get routines like new ones**.
31. As a **person who builds their own view over several harnesses**, I want **`routines list --json` to return routines and their runs in a stable, documented shape**, so that **my dashboard can show routines without parsing the files itself**.

## Implementation decisions

The sixteen decisions of the grill on 2026-10-27 are the frame; the lines
below spell them out where a file or a command needs it.

### Role

- **loopboard never starts an agent and has no timer** (decision 1,
  [ADR-0010](../../architecture/decisions/0010-routines-run-by-a-dispatcher-outside-loopboard.md)).
  It defines the format, the commands, `check`, a board view, a skill and the
  docs. Running is a **dispatcher**: a prompt an agent platform runs on a
  fixed beat — a Claude Code scheduled task, Codex, or plain cron calling
  `claude -p`. The server stays as project 04 left it: no scheduler, no
  route that creates issues.
- **loopboard does write a routine's bookkeeping when asked.** `due`,
  `start` and `finish` append to `runs.md`; `due` and `start` file the
  period's issue of a `creates: issue` routine. Every write is a CLI command
  someone ran, never the server.

### Files

- **One folder per routine** (decision 3):
  `<root>/scheduled/<slug>/routine.md` and `runs.md`. The folder may hold
  more files. A folder whose name starts with `_` or `.` is not a routine:
  `scheduled/_templates/routine.md` is the template the skill copies. The
  slug is the folder name and follows the issue slug rule.
- **`routine.md`**: frontmatter is the schedule and settings, the body the
  steps. Humans and the `routine` skill edit it; the only write loopboard
  makes is `enabled: false` after a one-time routine's run. Fields:

  | Field | Value | Default |
  |---|---|---|
  | `title` | display name | the slug |
  | `schedule` | five-field cron in quotes: minute, hour, day of month, month, day of week. `*`, numbers, ranges `1-5`, steps `*/15`, lists `1,15`, names `MON`/`JAN`, `7` = Sunday, `L` in the day of month = its last day; `@hourly`, `@daily`, `@weekly`, `@monthly`, `@yearly` | — |
  | `at` | one time: `YYYY-MM-DD HH:MM`, local in `timezone` | — |
  | `timezone` | an IANA zone, `Europe/Berlin` | the machine's zone |
  | `enabled` | `true` or `false` | `true` |
  | `expires-after` | a duration: `30m`, `6h`, `2d`, `1h30m` | none: a late slot always runs |
  | `timeout` | a duration | `2h` |
  | `host` | the one machine that runs it | any machine |
  | `writes-to` | other harnesses it may write to, by harness id: `[leben, steuern]` | none |
  | `created` | `YYYY-MM-DD`; no slot before this day counts | none |
  | `creates` | `issue` — the routine only files the period's issue | none: an agent routine |

  Exactly one of `schedule` and `at`. A `creates: issue` routine adds:

  | Field | Value | Default |
  |---|---|---|
  | `period` | `day`, `week` (ISO), `month`, `quarter` or `year` | required |
  | `issue-title` | pattern with `{period}`, `{previous}` (the period before) and `{date}` (the slot's day) | `<title> {period}` |
  | `issue-category`, `issue-status`, `issue-assignee` | the issue vocabularies | `task`, `todo`, `agent` |
  | `issue-labels` | `[a, b]` | `[]` |
  | `issue-project` | `NN-slug` of an existing project | none |
  | `issue-due-after` | whole days after the slot: `10d` — the issue's `due:` | none |

  Its body, with the same placeholders filled in, becomes the issue's body.
  Period labels: `2026-11-03`, `2026-W45`, `2026-11`, `2026-Q4`, `2026`.

- **Fields are read from their raw lines, not through YAML.** A cron
  expression starts with `*` (a YAML alias), `at` reads as a date, `0042`
  as an octal number and `on` as a boolean — the same reason the identity
  file is read line by line (ADR-0007). Unknown fields are kept and
  reported as a warning by `check`, so a typo like `expire-after` shows up.
- **`runs.md`** is append-only and written only by `due`, `start` and
  `finish` (decision 3). It is versioned like any file; no run commits by
  itself and nothing ignores it (decision 8). Exact format:

  ```markdown
  # Runs: Weekly report

  Written by `loopboard routines`, newest last. A later entry with the same
  `started` replaces the earlier one. Don't edit by hand.

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

  ## 2026-10-27 15:02 · expired
  - recorded: 2026-10-27T15:02:11+01:00
  - slot: 2026-10-27T07:30:00+01:00

  > 7h 32m after the slot; expires-after is 6h.
  ```

  An entry is a level-two heading `<local date and time> · <status>`,
  then `- key: value` lines, then an optional note as a block quote (so a
  `#` in a note never starts an entry). Times are ISO 8601 with the
  routine's offset, to the second. Statuses: `running`, `ok`, `failed`,
  `aborted` (the entries of one run, tied by `started`), `expired` (a slot
  recorded instead of run) and `missed` (earlier slots a catch-up run
  covered: `from`, `to`, `slots`). The last entry of a run is its state.
  Everything before the first entry is ignored; an entry that can't be read
  is skipped and reported by `check`.

### Schedules and due

- **Cron in a time zone** (decision 4). Day of month and day of week are
  ORed when both are restricted, as in cron. Days are the routine's local
  days. **Daylight saving:** a local time that doesn't exist on the day the
  clocks go forward runs at the same minute an hour later (02:30 → 03:30);
  a local time that happens twice when they go back runs once, the first
  time. Own implementation, no new dependency: about three hundred lines,
  shared by the server, the CLI and the client, with the DST rules above
  tested — a library would bring its own DST rules and no schedule in words.
- **A slot is due** (decisions 5 and 6) when the routine is enabled, valid,
  not pinned to another `host`, nothing of it is running, and the latest
  occurrence ≤ now — its **slot** — is later than its last handled time: the
  newest run's `started` or expired entry. Occurrences before the start of
  the `created` day don't count. Several missed occurrences lead to one run
  for the latest; the start of that run records the others as one `missed`
  entry. With `expires-after`, a slot older than that is recorded as
  `expired` instead.
- **Double starts** (decision 6). `start` appends `running` (start time,
  host) under a file lock, and refuses while a `running` entry of the
  routine is younger than `timeout`. The next `due` turns an older one into
  `aborted`. `host:` is compared with the machine's name, lower case and
  without `.local`; `routines list` prints the name it sees. Across devices
  on a synced folder the lock can't be atomic — `host:` is the answer there.
- **A one-time routine** (`at:`) is due once; its `finish`, expiry or filed
  issue writes `enabled: false` into `routine.md`.
- **`finish`** closes the routine's open run: the newest `running` entry,
  or an `aborted` one when the run outlived its timeout and reported late —
  the late result beats none. Without one it refuses.

### Commands

`<routine>` is a routine folder's path, or its slug in the harness at
`--path` (default: here). `[path]` is a harness, as for every other command.
Every command that writes takes `--dry-run`, which reports and writes
nothing — the same contract as `init` and `renumber`.

| Command | Does |
|---|---|
| `loopboard routines [list] [path]` | Routines with the schedule in words, the next slot and the last run. `--under <dir>`, `--json` |
| `loopboard routines due [path]` | What is due now. Writes the bookkeeping that needs no agent — `aborted`, `expired`, the period's issue of a `creates: issue` routine — and lists the agent routines to run. `--under <dir>`, `--json`, `--dry-run` |
| `loopboard routines start <routine>` | Records the start of a run; for a `creates: issue` routine files the period's issue instead. `--json`, `--dry-run` |
| `loopboard routines finish <routine> --status ok\|failed --note <text>` | Records the outcome and the note; `--note -` reads it from stdin |
| `loopboard routines prompt <routine>` | Prints the brief for the run |
| `loopboard routines dispatcher-prompt [path]` | Prints the dispatcher prompt for this harness or `--under <dir>` |

- **Scope** (decision 9): without `--under`, the harness at `[path]`.
  `--under <dir>` covers every harness physically under the folder, the
  folder itself included: it doesn't follow symlinks and skips hidden
  folders, `node_modules` and macOS packages (`*.app`, `*.sparsebundle`,
  …). It is a folder the user names, never a crawl of the home directory
  (ADR-0002, ADR-0010).
- **The brief** (decision 7) is assembled from the routine (title,
  schedule, slot, steps), the harness (id, name, path, the purpose
  paragraph of `.agents/harness.md`, the pointer to `AGENTS.md`), the notes
  of the last three runs, the fixed rules — work only in this harness and
  the `writes-to` harnesses, follow their own rules, never commit, push or
  send unless the steps say so explicitly, don't touch the routine's files,
  stop and fail instead of faking — and the exact `finish` command.
- **The dispatcher** (decisions 10–12) handles due routines one after
  another, each in its own sub-agent with fresh context, working directory
  the routine's harness, brief from `prompt`; makes sure every run ends with
  `finish`; sends a push notification per run when its platform can; never
  sends anything else. Its prompt lives in the docs and is printed by
  `dispatcher-prompt` with the scope filled in.
- **`writes-to`** (decision 11) holds harness ids. `check` validates each
  against the id rule (ADR-0008, an error) and against the registered
  workspaces and their identity files' ids and aliases (a warning: the
  harness may live on another machine). loopboard passes the list on in the
  brief; enforcing it is the harness's own rules.
- **`check`** validates every routine — cron, `at`, the zone, durations,
  vocabularies, the project of `issue-project`, `writes-to`, unknown fields,
  unreadable `runs.md` entries — and reports two issues that carry the same
  `recurrence:`. A broken routine or a duplicate recurrence fails the check
  (✗, exit 1); warnings fail only with `--strict`.
- **JSON is a contract** (decision 16). `list --json` and `due --json`
  carry `"version": 1` and are documented field by field in
  `docs/routines.md`. Fields are only ever added within a version.
  `list --json` includes every run of every routine and the graph's days,
  so a dashboard needs no cron engine.

### Recurring issues (decision 2, supersedes #0090)

- Filing is `nextId` plus the root's template rules, like an issue created
  on the board, with `due:` from `issue-due-after` and
  `recurrence: <slug>@<period>` — the period of the slot. A run finds an
  existing issue by that value across live and archived issues and files
  nothing; it records `ok` either way and names the issue in the note.
- Missed periods are not back-filled: a catch-up files the latest period
  and records the others as `missed`.
- `recurrence` leaves the issues README's reserved fields: loopboard reads
  it now. The README says who writes it, and that it's never set by hand.

### Board

- **A read-only Routines view per workspace** (decision 13) at
  `/w/:ws/routines` and `/w/:ws/routines/:slug`, fed by one route,
  `GET /api/w/:id/routines`, with what `list --json` returns for that
  harness. The rail lists it under Workspace once the harness has a
  routine — a harness without routines keeps its rail as it is; ⌘K "Go to
  Routines" always works and leads to an empty state that says how to
  create one. Live updates come through the existing watcher: both files
  are markdown under the root.
- **Contribution graphs** (decision 14): 53 week columns of seven days,
  Monday on top, ending with today; each routine's days are its local days.
  A day is red when a run failed or was aborted, else green when runs
  finished (four shades, relative to the routine's busiest day), else grey
  when a slot was missed or expired — recorded, or a past slot of an
  enabled routine on or after its `created` day with no entry at all, so a
  dispatcher that stopped shows — else empty. A workspace graph on top sums
  the routines the same way. Hover shows the day's runs with time, status
  and note. The colors are tokens in both themes, and the state colors pass
  the repo's contrast script at 3:1 against the background.

### Agents and setup (decision 15)

- **Skill `routine`** ships with the core skills (it is installed like
  `grill-me`): create, change, pause and show a routine; turns "weekdays at
  07:30" into cron and reads it back in words; asks for the steps,
  `expires-after` and `writes-to`; copies the template; validates with
  `loopboard check`; never creates a task of an agent platform.
- **The AGENTS block** gains one rule — recurring work and reminders become
  routines in `.agents/scheduled/`, never tasks of an agent platform — with
  the skill in a code harness and the folder's README in a docs harness
  (a docs harness has no skills). It overrides an agent's default "create
  a scheduled task".
- **Scaffold.** `.agents/scheduled/README.md` and
  `scheduled/_templates/routine.md`, in a code and a docs version. `init`
  creates them, `init --upgrade` adds them to existing harnesses, and
  migration **M003** names the folder, the skill, the rule and — confirm
  first — moving the platform tasks that belong to the harness.

## Testing decisions

- Behaviour through the CLI (`main()` in Vitest on real temp folders; the
  built binary in Playwright), the HTTP route and the rendered view — as in
  projects 01 and 04. Pure logic gets unit tests; "now" is a parameter of
  every function that needs it, so tests never wait for a clock.
- **Cron:** next and previous occurrence in UTC, `Europe/Berlin`,
  `America/New_York` and a half-hour zone; both DST changes; `L`, the 31st,
  29 February, day-of-month OR day-of-week, macros, names, ranges and steps;
  invalid expressions with a reason; the schedule in words.
- **Due:** a fresh routine, `created`, a catch-up with its `missed` entry,
  `expires-after`, a run younger and older than `timeout`, `aborted`,
  `host`, a paused and an invalid routine, a one-time routine switching
  itself off, `--under` across nested harnesses and skipped folders.
- **runs.md:** round trip of every status, notes with headings, a broken
  entry, a late `finish` after `aborted`, two `start`s at once.
- **Recurring issues:** period labels and `{previous}` at the turn of the
  year, quarter starts, ISO weeks 52/53, `L` in February and on 29
  February, the 31st; idempotence across live and archived issues; the
  duplicate in `check`.
- **Board:** Playwright against a temp harness served by the built binary
  (the demo fixture stays without routines, so the visual baselines don't
  move): the list, the detail with steps and notes, the graph's cells and
  their hover text, the empty state.
- Prior art: `tests/ids.test.ts`, `tests/init.test.ts`, `tests/cli.test.ts`
  and `tests/e2e/cli.spec.ts`.

## Out of scope

- **A timer, a daemon or agents started by loopboard** — decision 1 and
  ADR-0010; the server stays passive.
- **A notification channel** — decision 12; the dispatcher's platform
  notifies.
- **Pausing, running or editing a routine from the board** — the view is
  read-only (decision 13); the skill and the files are the editors.
- **Routines across a whole tree in one view** — ADR-0009; that's the
  private dashboard, which reads `list --json` (decision 16).
- **Moving today's platform tasks into routines** — later sessions, per
  harness (decision 16); M003 only names the step.
- **Cron extensions beyond `L`** (`W`, `#`, `?`, seconds) — five fields
  plus "last day" cover the known routines.
- **Back-filling missed periods** — a catch-up handles the latest slot;
  the others are recorded.
- **Pruning `runs.md`** — one short entry per run; prune by hand if it ever
  matters.
- **An atomic lock across devices on a synced folder** — impossible with
  plain files; `host:` pins a routine to one machine.

## Further notes

- Glossary: **Routine**, **Run**, **Slot**, **Dispatcher**, **Brief** in
  [`00-conventions-and-glossary.md`](../../specs/00-conventions-and-glossary.md).
- Project 04's "Recurrence is a CLI command" and stories 25–27 are carried
  out here: `routines due` is that command, and the server still never
  creates issues on its own. #0090 is closed as superseded.
- The private dashboard and moving existing tasks come later, in other
  sessions; they rely on `list --json` staying stable.
