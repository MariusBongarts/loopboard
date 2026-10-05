---
id: 0042
title: Malformed issue files come back as ghost issues after the first read
category: bug
status: done
assignee: agent
labels: [server]
created: 2026-10-04
---

## Steps to reproduce

1. Put an issue file with invalid YAML frontmatter in the root, e.g. an
   unquoted colon: `title: Someday: dark mode`.
2. Load the board (first `GET /api/data`), then reload it.

## Current

The first read skips the file with "[loopboard] skipping …". Every later read
returns it as an issue titled with its filename, status `todo`, no date — so
it lands in the feed under "No date" and in the Todo column. gray-matter
caches a file *before* parsing it, and the throw leaves an empty cached entry
that later calls return without parsing.

## Expected

The file is skipped on every read, as specs § 1 "A malformed issue file does
not break the board" says.

## Acceptance criteria

- [x] Reading the same malformed file twice skips it both times (Vitest regression)
- [x] Issue writes (`mutate`) are not affected by stale cache entries either
- [x] A malformed fixture file + Playwright test cover the § 1 scenario

## Out of scope

- Surfacing skipped files in the UI

## Notes

- Found while building the e2e fixture in #0006. Passing an options object to
  `matter()` bypasses its cache.
