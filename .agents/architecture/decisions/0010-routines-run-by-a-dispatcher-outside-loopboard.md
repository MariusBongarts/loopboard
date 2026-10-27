# Routines are files in the harness, run by a dispatcher outside loopboard

- **Status**: accepted — amends [ADR-0002](0002-workspace-registry-in-user-config.md); supersedes #0090
- **Date**: 2026-10-27

Recurring agent work lived as scheduled tasks inside one agent platform, in
that platform's config and outside the harness it served. The maintainer
decided on 2026-10-27 (project
[05](../../projects/05-routines/prd.md)) that every harness carries its own
**routines** as files, and that one **dispatcher** per place runs them.

## Decision

- **A routine is a folder in the harness:**
  `<root>/scheduled/<slug>/routine.md` holds the schedule (five-field cron
  or a one-time `at`, with a time zone) in its frontmatter and the steps in
  its body; `runs.md` next to it is an append-only log of runs with a short
  note each. Both are versioned with the harness; no run commits.
- **loopboard never starts an agent and has no timer.** It reads and
  validates routines, decides what is due (`loopboard routines due`),
  records starts and outcomes in `runs.md`, assembles each run's brief from
  the routine, the harness and the last three notes, and shows routines on
  the board. The server writes nothing: every write is a CLI command
  someone — or the dispatcher — ran.
- **A dispatcher runs them.** It is a prompt, shipped in the docs and
  printed by `loopboard routines dispatcher-prompt`, that an agent platform
  runs on a fixed beat: a Claude Code scheduled task, Codex, or cron with
  `claude -p`. It runs each due routine in its own sub-agent with fresh
  context in the routine's harness, ends every run with `finish`, and
  notifies through its platform. One dispatcher per place — a code repo, or
  a folder of document harnesses with `--under <dir>`.
- **A routine that only files the period's issue needs no agent.** With
  `creates: issue`, `due` files it itself, stamped
  `recurrence: <slug>@<period>`, exactly once across live and archived
  issues. This replaces the separate `loopboard recur` that #0090 planned.
- **`--under <dir>` reads every harness under a folder the user names.**
  It amends ADR-0002's "no auto-discovery": loopboard still never crawls a
  folder nobody named, follows no symlinks and skips hidden folders,
  `node_modules` and macOS packages.

## Considered options

- **A scheduler in loopboard's server** — rejected again (project 04): the
  board isn't always running, a board that starts agents is a different and
  riskier product, and the server would start writing files on its own.
- **One platform task per routine** (the status quo) — every routine locked
  into one platform, invisible to the harness, no shared run history.
- **A cron entry per routine** — per-OS setup for each, no lock, no memory
  between runs, and an agent would still need a brief.

## Consequences

- Switching platforms moves one dispatcher, not every routine.
- Double starts are prevented by a `running` entry and a timeout on one
  machine; on a folder synced between machines plain files can't lock
  atomically, so `host:` pins a routine to one machine.
- Writing rights (`writes-to:`) and "never send" are rules the brief and the
  dispatcher prompt state; enforcing them is the harness's own rules and
  the platform's permissions, not loopboard's.
- `runs.md` grows by one entry per run and is pruned by hand if ever needed.
- Project 04's "Recurrence is a CLI command" stands, with `routines due` as
  that command.
