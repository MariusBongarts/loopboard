---
id: 0083
title: Turn an id or a reference into a path with loopboard where and resolve
category: user-story
status: todo
assignee: agent
project: 04-harness-tree
phase: 1
parent: 0082
labels: [cli, ids]
created: 2026-10-13
---

## User story

As an **agent working in one harness that needs something from another**, I
want **`loopboard where <id>` and `loopboard resolve <ref>` to print absolute
paths, and `loopboard next-id --harness <id>` to allocate a number there**,
so that **I follow a reference or file an issue in another harness without
guessing where it lives or which number is free**.

## Acceptance criteria

- [ ] `loopboard where <id|alias>` prints the absolute path of that node's folder; `--json` adds id, name, kind, type, parent, aliases, and the root loopboard reads there (`.agents/` or a legacy `ai/`); an unknown id exits 1 and lists the ids that are registered
- [ ] `loopboard resolve <ref>` prints the absolute path for `<id>#NNNN` (the issue file, live or archived), `<id>#PNN` (the project folder) and `<id>:<path>` (the file); an unqualified `#NNNN` resolves in the harness of the current folder; `--json` adds the kind of target and, for an issue, its title and status
- [ ] A reference that doesn't resolve exits 1 with one line saying why: unknown id, no such issue, no such project, no such file, folder missing
- [ ] `<id>:<path>` never resolves outside the harness folder: `..`, absolute paths and symlinks that lead out are refused
- [ ] `loopboard next-id <issue|project> --harness <id>` prints the next free number of that harness from any folder
- [ ] All three work without git and without a running board, appear in `--help`, and are tested from a foreign working directory against two temp harnesses
- [ ] The issues README and the implement and to-issues skills say to follow a qualified reference with `loopboard resolve`; spec § 10 gains the scenarios

## Out of scope

- Listing and pruning the registry — `loopboard workspaces` (#0099)
- Resolving `@id` to a person's or an organisation's file, and the objects folder — not loopboard's (ADR-0009)
- Opening the resolved file — the command prints a path; what opens it is the caller's business
- Allocating numbers for a harness that isn't registered — pass its path, as today

## Notes

- PRD stories 18, 19. These commands read the registry and the files; they
  must not need the server, because agents call them while no board is open.
- "Root" keeps its glossary meaning here — the folder loopboard reads.
- `next-id <kind> [path]` keeps working; `--harness` is a second way to name
  the target.
- Skill and README wording is shipped text, not a workflow change — no
  migration entry.
- One line of output per command by default, so a script can use the result
  without parsing.
