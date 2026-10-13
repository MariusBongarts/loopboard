---
id: 0099
title: List and forget registered workspaces from the CLI
category: task
status: in-review
assignee: human
labels: [cli, workspaces]
created: 2026-10-13
---

## What needs to change

The registry collects dead entries, and only a running board can show or
remove them. A workspace's id is tied to its path, so a harness whose root
moved (`ai/` → `.agents/`) stays behind as a "folder missing" entry next to
its new twin, and a git worktree that was opened once stays registered as a
workspace of its own. The only way to see or remove them is the "Manage
workspaces" dialog.

Give the CLI a command that lists the registry and forgets entries.

## Why

Project 04 registers many more folders than today. The registry should be
clean before the nodes of a tree go in, and agents need to read it: the
identity migration asks a harness which id it is registered under (#0103).

## Acceptance criteria

- [x] `loopboard workspaces` lists every registered workspace with id, name, path and whether its folder exists; `--json` prints the same as data
- [x] `loopboard workspaces forget <id>…` removes those entries, prints what it removed and never touches a harness's files; an unknown id exits 1 and changes nothing
- [x] Both work without a running board and without git, from any folder; a running board shows the change on its next load
- [x] `--help`, the README's CLI table and spec § 7 describe the command; tests use their own config directory

## Out of scope

- `--missing` (forget every entry whose folder is gone) and telling a git worktree from its main checkout — add them if cleaning by id gets tedious; #0080 changes how worktrees register anyway
- Keeping one entry when a harness moves — that needs the identity file (#0079, #0080)
- Deleting a forgotten workspace's saved views

## Review

Hand over as `in-review`, `assignee: human`: which entries go is the
maintainer's call.

- [ ] Run `loopboard workspaces`, decide which entries to forget, and forget them

Until the CLI is on the PATH (#0076), run it from a clone: `pnpm build`, then
`node bin/loopboard.js workspaces`.

## Notes

- Split from #0076 in the review round. Together the two are the first step
  of the order decided for project 04: the CLI callable everywhere, the
  registry clean.
- The board already forgets a workspace without touching its files; the
  command is a second caller of the same code.
- Forgetting a workspace leaves its saved views behind in the config
  directory; say so in the output rather than deleting them silently.
- Built: the listed path is the root, as in "Manage workspaces" — a moved
  root and its new twin share one repo path. `--json` is a list of
  `{ id, name, path, exists }`. `forget` is all or nothing: one unknown id
  and no entry goes. The saved-views line appears only for a workspace that
  has a views file.
- Review round: the CLI is a second writer of `workspaces.json` next to a
  running board, and the registry was only serialized inside one process: a
  `forget` that overlapped a board write (the board notes the last-used
  workspace on every load) could be undone although the CLI had printed
  "forgot". Every registry update now holds `workspaces.json.lock`. Run as a
  stress test against the built CLI: the forgotten entry came back in 0 of
  25 rounds (before: 37 of 40).
