---
id: 0075
title: Keep large boards fast
category: task
status: todo
assignee: agent
labels: [server, data]
created: 2026-10-13
---

## What needs to change

Measured on a real workspace with ~950 live and ~200 archived issues:

- `/api/w/:id/data` answers in ~0.2 s but returns 10.9 MB uncompressed —
  every issue with its full body — and the client refetches it on every file
  change.
- Creating an issue blocks the server for 3.6 s: the ID allocator walks
  every git ref (191 here) synchronously.
- Nothing is virtualised: pickers and lists render every row.

Send less, cache what didn't change, and take ID allocation off the hot
path.

## Why

Issue #0010 deferred optimisation until there was a measurement. This is the
measurement. It also bounds how well the board copes once several large
workspaces are registered.

## Acceptance criteria

- [ ] `/data` returns issues without bodies; the body loads when an issue
  opens. The reference workspace's payload is under 1.5 MB
- [ ] Parsed issues are cached per file (path, mtime, size); the archive is
  read only when a view needs it
- [ ] Creating an issue blocks the server for at most 300 ms (cache per refs
  fingerprint, or allocate asynchronously)
- [ ] Parent pickers and lists render at most 100 rows at a time or
  virtualise
- [ ] Responses are compressed
- [ ] A benchmark script against a generated 1,000-issue fixture records
  payload size and create latency

## Out of scope

- A database or index file on disk — files stay the source of truth
- Pagination of the board columns (see #0074 for the Done column)

## Notes

- Search currently relies on bodies being in memory on the client; move it
  to a server endpoint or load bodies lazily when the search box is used.
