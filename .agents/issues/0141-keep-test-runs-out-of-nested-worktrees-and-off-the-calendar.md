---
id: 0141
title: Keep test runs out of nested worktrees and off the calendar
category: task
status: done
assignee: agent
labels: [tests]
created: 2026-11-04
---

## What needs to change

`pnpm verify` and `pnpm test:e2e` failed for reasons outside the code under test:

- **Nested worktrees.** `vitest run` also collected `.claude/worktrees/*/tests`, so another checkout's failure failed this one. Exclude `.claude/**` in the `test` block of `vite.config.ts`, next to vitest's default excludes.
- **The local day.** `tests/decisions.test.ts` expected the UTC day, while an answer is stamped with the machine's day. The fixture's `timezone: UTC` has been ignored since #0140, so it failed whenever the two differ: 00:00–07:00 on a machine at UTC+7. The test now pins `TZ` and the leftover line is gone.
- **Scaffold count.** `tests/e2e/cli.spec.ts` expected 13 files from `init --kind docs`. #0136 added `scheduled/_templates/log.md`, so it's 14.

The two routine tests that expected `state: 'idle'` already pass at any date since af4b25a on `main`, which accepts `idle`, `due` or `expired`. They stay as they are here: `claude/pin-routine-clock` (81e3c1e, not merged, under #0140) pins the clock and asserts `idle` again.

## Why

No product behavior changes. A red `verify` that has nothing to do with the task hides real failures and costs every session the time to rule them out.

## Acceptance criteria

- [x] `pnpm verify` passes with a failing test file under `.claude/worktrees`; that file failed the run before this change
- [x] A worktree under `.claude/worktrees` still runs its own tests: 50 files, 566 tests here
- [x] `tests/routines.test.ts` and the § 15 "write a routine" scenario pass with the clock moved across a Monday's slot (before, just after, past `expires-after`), a year end, a leap day and years ahead
- [x] The whole Vitest suite passes at those dates apart from the lock artifacts under Memory, including the local-day window that failed `tests/decisions.test.ts`
- [x] `pnpm test:e2e` passes

## Out of scope

- Merging `claude/pin-routine-clock`. It touches none of the files changed here and its two test files pass at the same dates; ticking #0140's open `pnpm verify` criterion is part of it
- Any product change

## Memory

- **How the dates were checked.** A `NODE_OPTIONS=--import=<preload>` script replaces `Date` with one offset to a chosen instant. It reaches Vitest's workers and the real binary in E2E. Control: the assertion from before af4b25a flips to `due` and `expired` as the clock moves, so the shift does arrive.
- **Lock artifacts of that method.** `withFileLock` ages a lock by `Date.now() - mtime`, and a shifted `Date` doesn't move real mtimes, so a held lock looks stale. That fails "waits for another process" and "records one run when two start at once" with the clock moved ahead. Shifting `.lock` mtimes too clears both, but fails "takes over a lock" instead, because that test writes its mtime from the already shifted `Date`. All three pass on the real clock.
