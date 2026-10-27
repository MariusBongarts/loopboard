---
id: 0119
title: Brief each run and print the dispatcher prompt
category: user-story
status: todo
assignee: agent
project: 05-routines
phase: 1
parent: 0117
labels: [cli, routines, docs]
created: 2026-10-27
---

## User story

As a **sub-agent running a routine**, I want **a brief with the routine's
steps, the harness, the notes of the last three runs, the rules and the exact
`finish` command**, and as a **maintainer** I want **a ready dispatcher prompt
with setup examples**, so that **every run starts informed and ends recorded,
on whichever platform I use**.

## Acceptance criteria

- [ ] `loopboard routines prompt <routine>` prints the brief: routine title, schedule in words, the slot of the open run (or "manual"), working directory, harness id, name and purpose paragraph, `AGENTS.md`, the steps, the last three run notes newest first (or "first run"), the fixed rules (only this harness and `writes-to`, never commit/push/send unless the steps say so, don't touch the routine's files, fail instead of faking, end with a short note) and the exact `finish` commands for ok and failed
- [ ] `loopboard routines dispatcher-prompt [path]` / `--under <dir>` prints the dispatcher prompt with the scope filled in: `due --json`, then per routine one after another `start`, a fresh sub-agent in the harness with the brief, a `finish` if the sub-agent didn't, a push notification where the platform can, never any other message
- [ ] The prompt lives in `docs/dispatcher-prompt.md`, ships with the package, and the docs show setup for a Claude Code scheduled task, Codex and cron with `claude -p`
- [ ] Spec § 15 gains the scenarios; Vitest covers the brief's parts and the filled-in scope

## Out of scope

- Running anything — the platform runs the dispatcher (ADR-0010)

## Notes

- PRD "The brief", "The dispatcher", stories 13 and 20–23.
