---
id: 0010
title: Update the board live when files change on disk
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 2
parent: 0008
labels: [server, ui]
created: 2026-10-04
---

## User story

As a **developer watching an agent work**, I want **cards to move and new issues, sessions and specs to appear as files change on disk**, so that **I never press Refresh**.

## Acceptance criteria

- [x] The server watches the active workspace root (chokidar) while at least one client is connected, and stops when none are
- [x] Changes are pushed over Server-Sent Events; the client refetches that workspace, debounced (one refetch for a burst of writes)
- [x] The current selection, open drawer and scroll position survive a refetch
- [x] The Refresh button is removed; a small indicator shows when the live connection drops and reconnects
- [x] Playwright: writing a fixture file moves its card without a reload

## Out of scope

- Per-file diffs over the wire — whole-workspace refetch is fast enough at 800+ issues; optimize only if measured

## Notes

- PRD story 11. Ignore `node_modules` and temp files written by atomic saves.

## Outcome

- `fs.watch` with `recursive` (Node ≥ 20 on all three OSs) instead of
  chokidar — no dependency. Only `.md` paths count: on macOS a temp file
  also reports its parent directory, which name filters can't catch.
- The Refresh button became a live dot; when the stream drops, an "Offline"
  badge offers an immediate reload, and the reconnect refetches.
