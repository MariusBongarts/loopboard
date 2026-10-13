---
id: 0072
title: Live updates stop silently when the file watcher fails
category: bug
status: done
assignee: agent
labels: [server, ui]
created: 2026-10-13
---

## Steps to reproduce

1. Open a workspace on the board; the rail shows "Live".
2. Make the recursive watcher emit an error (e.g. the watched root is
   replaced or briefly unavailable, as happens on synced or network folders).
3. Edit an issue file.

Also: register a workspace whose `issues/` folder is a symlink and edit an
issue through the link target.

## Current behavior

On a watcher error the hub closes the watcher and forgets the root. Nothing
re-subscribes and the client is never told, so the indicator keeps saying
"Live" while no events arrive until the page is reloaded. A symlinked
`issues/` folder never produces events at all.

## Expected behavior

The board either is live or says it isn't. After a watcher failure it
recovers on its own, and a manual refresh is always one action away.

## Acceptance criteria (verification)

- [x] On a watcher error the client is notified (state is no longer "live"
  and one refetch runs) and the server re-watches with backoff
- [x] Optional polling (`LOOPBOARD_POLL_MS`) compares mtime and file count of
  `issues/` and `projects/` and emits the same change event
- [x] A symlinked `issues/` or `projects/` folder is detected and falls back
  to polling
- [x] "Refresh" is always reachable (⌘K and a click on the live indicator)
- [x] A test simulates the watcher error and checks the re-subscription

## Out of scope

- Per-file change events (the board refetches the workspace today)
- Detecting conflict copies written by sync clients (see #0071)

## Notes

- Related: #0071 reports files the reader had to skip.
- The stream gained a `stale` event; `ready` is sent again once the root is
  watched. A root that can't be watched when a client connects (missing
  folder) is reported and retried the same way.
- Polling runs next to the watcher, not instead of it: the watcher still
  covers `specs/`. A change both see causes two refetches.
- Not covered: a watcher that goes quiet without an error. On macOS a
  replaced root raises none, and a renamed folder only produces directory
  events, which the hub ignores (#0010) — `LOOPBOARD_POLL_MS` catches both
  for `issues/` and `projects/`.
