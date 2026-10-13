---
id: 0095
title: Register a whole folder tree in one step
category: user-story
status: backlog
assignee: agent
project: 04-harness-tree
phase: 3
parent: 0080
labels: [cli, workspaces, docs]
created: 2026-10-13
---

## User story

As a **maintainer whose harnesses sit under one folder**, I want **to name
that folder once and have loopboard register every harness and index node
below it — and, when I run it again, notice which moved or vanished**, so
that **I don't add ten nodes by hand, while loopboard still never looks
anywhere I didn't point it at**.

## Acceptance criteria

- [ ] A new ADR amends ADR-0002: loopboard still never crawls the home directory or discovers anything on its own; scanning one folder the user names, when the user asks, is allowed — with the depth limit and the skipped folder names written down
- [ ] `loopboard add --tree <folder>` finds every `.agents/harness.md` below that folder (bounded depth; skipping `.git`, `node_modules`, build output and agent-tool worktree folders), prints what it found and registers it after a confirmation; `--dry-run` only lists and `--yes` skips the question
- [ ] The home directory and a file-system root are refused as the folder to scan
- [ ] Only folders with an identity file are registered; a harness without one still needs an explicit add
- [ ] Running it again on the same folder re-attaches nodes that moved (by id, as in #0080), offers the new ones and lists the ones that vanished; a scan never forgets anything
- [ ] A scan reads identity files only — no issue content — and a test on a temp tree covers a nested harness, an index node, a worktree folder that must be skipped and a symlink loop
- [ ] Spec § 7 gains the scenarios; `--help` and the README's CLI table name the command

## Out of scope

- "Add folder tree…" in the switcher — #0108
- A "Rescan" action and a registry that remembers which folders were added as trees — running the command again does the same; deferred in `wip.md`
- Scanning in the background or on a schedule — a scan happens when the user asks
- Watching the tree folder for new harnesses
- Registering folders that have no identity file by guessing from `issues/`
- Remote or networked folders as a special case — they are just slow folders; the depth limit applies

## Notes

- PRD stories 44, 45. ADR-0002 rejected auto-discovery as "slow and
  surprising for an open-source tool to crawl the home folder". Both reasons
  still hold; a named folder, scanned on request, is neither.
- Also needs #0081: a scan finds index nodes, and they have to be
  registrable.
- On a synced folder a scan must not download placeholders: look for the
  identity file by name and read only that.
- The command's name (`add --tree`) is a proposal; settle it with the ADR.
- Vanished nodes are forgotten with `loopboard workspaces forget` (#0099).
