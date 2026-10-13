---
id: 0071
title: Skipped and unreadable issue files vanish without a trace
category: bug
status: done
assignee: agent
labels: [server, data]
created: 2026-10-13
---

## Steps to reproduce

1. In a workspace, add `.agents/issues/0002-Tax-Return.md` (capital letters in
   the slug) and `.agents/issues/0003-broken.md` whose frontmatter has an
   unquoted colon in `title:`.
2. Open the board.
3. Separately: make one issue file unreadable (`chmod 000`, or a cloud-only
   placeholder on a synced folder that fails to hydrate) and reload.

## Current behavior

- Steps 1–2: both files are missing from every view. The only trace is a
  `console.warn` in the server log for the malformed one; the mis-named one
  is dropped silently because it fails the filename pattern. `next-id` still
  counts them, so the board and the allocator disagree about what exists.
- Step 3: `stat`/`readFile` throw outside the try block, so the whole
  `/api/w/:id/data` response is a 500 and the workspace shows nothing.

Seen on a real workspace with ~950 live issues: 7 issues were invisible (6
with broken YAML, 1 with capitals in the filename) and nobody noticed.

## Expected behavior

A file the reader can't show is reported, never dropped: the board says how
many files it skipped and why, and one bad file never takes the workspace
down.

## Acceptance criteria (verification)

- [x] `/api/w/:id/data` returns `skipped: [{ file, reason }]` covering
  malformed frontmatter, filenames that look like issues but fail the
  pattern, and files that can't be read
- [x] An unreadable file is skipped and reported instead of failing the
  request
- [x] The rail shows "N files skipped"; opening it lists each file with its
  reason and a copyable prompt asking the agent to fix them
- [x] Project folders with an invalid name (`NN-slug` pattern) are reported
  the same way
- [x] Reader, counters and the ID allocator share one filename matcher
- [x] `loopboard check` prints the same list; `--strict` exits 1 when it's
  not empty
- [x] Regression tests cover the three skip reasons and the unreadable file

## Out of scope

- Auto-repairing files — the board reports, the agent fixes
- Loosening the filename pattern (non-ASCII slugs)

## Notes

- Matters most for workspaces on synced folders (OneDrive, iCloud), where
  conflict copies and offline placeholders are normal.
- "Looks like an issue" is a markdown file in `issues/` that starts with a
  digit; in `projects/` every folder counts unless its name starts with `_`
  or `.`. A near-miss name keeps the number it claims, so `next-id` never
  hands it out again ([server/names.ts](../../server/names.ts)).
- `findIssueFile` uses the same matcher: with `0002-Tax-Return.md` next to
  `0002-cache-the-feed.md`, a board write could land in the hidden twin.
- `loopboard check` used to crash on an unreadable file while looking for
  dangling references; it lists the file as skipped now.
- Renaming a project folder alone emits no `.md` event (the watcher ignores
  directory events), so the count follows on the next file change or reload.
- The e2e demo workspace keeps its malformed `0009`, so its rail shows
  "1 file skipped" on every screen. The visual baselines for the list,
  projects, specs and the issue page show the new row. Those with the board
  in view (inbox, panel, menu, editor, palette) were left alone: the board's
  toolbar had already moved away from them before this change, and the inbox
  ones fail without it too.
