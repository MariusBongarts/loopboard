---
id: 0099
title: List and forget registered workspaces from the CLI
category: task
status: todo
assignee: agent
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

- [ ] `loopboard workspaces` lists every registered workspace with id, name, path and whether its folder exists; `--json` prints the same as data
- [ ] `loopboard workspaces forget <id>…` removes those entries, prints what it removed and never touches a harness's files; an unknown id exits 1 and changes nothing
- [ ] Both work without a running board and without git, from any folder; a running board shows the change on its next load
- [ ] `--help`, the README's CLI table and spec § 7 describe the command; tests use their own config directory

## Out of scope

- `--missing` (forget every entry whose folder is gone) and telling a git worktree from its main checkout — add them if cleaning by id gets tedious; #0080 changes how worktrees register anyway
- Keeping one entry when a harness moves — that needs the identity file (#0079, #0080)
- Deleting a forgotten workspace's saved views

## Review

Hand over as `in-review`, `assignee: human`: which entries go is the
maintainer's call.

- [ ] Run `loopboard workspaces`, decide which entries to forget, and forget them

## Notes

- Split from #0076 in the review round. Together the two are the first step
  of the order decided for project 04: the CLI callable everywhere, the
  registry clean.
- The board already forgets a workspace without touching its files; the
  command is a second caller of the same code.
- Forgetting a workspace leaves its saved views behind in the config
  directory; say so in the output rather than deleting them silently.
