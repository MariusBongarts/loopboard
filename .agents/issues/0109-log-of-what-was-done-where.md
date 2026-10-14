---
id: 0109
title: Keep a log at the top of the tree of what was done where
category: user-story
status: wontfix
assignee: human
project: 04-harness-tree
phase: 3
parent: 0092
labels: [cli, workflow, conventions]
created: 2026-10-13
---

## Why rejected

Moved out of loopboard on 2026-10-14
([ADR-0009](../architecture/decisions/0009-views-over-a-tree-live-outside-loopboard.md)).
A log at the top of the tree — like every view over a whole tree of harnesses — belongs to a
tool built on the same files, not to the board. loopboard stays a board per
harness, for code and for documents, and keeps those files readable for
such tools: the identity file, the reserved fields, `workspaces --json` and
stable URLs (#0113). The text below stays as the record of what was
planned.

## User story

As a **maintainer whose agents work in many harnesses**, I want **one file
at the top of my tree that keeps book of what was last done where**, so that
**I, and any agent starting a session, can pick up the thread without
opening every harness**.

## Acceptance criteria

Written for the proposals under "Questions"; adjust them to the answers.

- [ ] `loopboard recent [--all] [--json]` prints the newest dated session entries — date, harness, project, first line — for the current harness or, with `--all`, for every registered one; it needs no running board
- [ ] `loopboard log "<what was done>" [--issue <ref>]` appends one dated line — date, harness id, the issue or project it belongs to, the text — to the log file of the tree's top node. It works from any harness of the tree and without git, and never rewrites earlier lines
- [ ] Both workflow blocks, code and docs, gain one step: after a session, append a line with `loopboard log` — also for standalone issues and for work that belongs to no project
- [ ] The Overview's "Recent" section (#0092) merges the log's lines with the session entries it already shows, newest first, without showing one session twice
- [ ] Two devices appending on a synced folder lose no line: an append is one line at the end of the file, and a conflict copy of the log is reported like any other skipped file (#0071)
- [ ] The README, Help → Reference and the glossary describe the log; the new step in the session loop gets its `MIGRATIONS.md` entry

## Questions

Assigned to the maintainer. The request behind this project asked, as a
maybe, for a root memory file that keeps book whenever something was done
somewhere. The product direction keeps a journal hook, a pointer file and a
routing skill out of the product as private glue. The hook is glue; the need
is not — so it is on the board, with these questions open:

1. **Derived, written, or both?** The Overview's "Recent" section (#0092)
   and `loopboard recent` derive "what was last done where" from the session
   entries every project's WIP already has: no new file, nothing to forget.
   What they miss is work on standalone issues, harnesses without projects —
   a docs harness often has none — and anything done outside an issue.
   Proposal: the derived view ships with #0092, and a written file covers
   what it misses.
2. **Which file?** Proposal: `LOG.md` in the folder of the tree's top node,
   next to `INDEX.md` — one line per entry, newest last, readable without
   loopboard.
3. **Who appends?** Proposal: a CLI command, `loopboard log`, that the
   session loop in the workflow block calls, so it works with every agent
   tool. A hook of one agent tool that writes after each session stays
   private.
4. **What does the Overview show?** Proposal: the merged "Recent" list; no
   separate log page.

## Out of scope

- A hook for one agent tool that writes the log on its own — private glue
- A pointer file to the tree and a skill that routes a request to the right harness — private glue (PRD, "Out of scope")
- Memory about a person — that is the person's file (#0087)
- Summarising or pruning the log

## Notes

- PRD story 41. Filed in the review round: the first plan had cut this down
  to the date of each project's last session.
- Also needs #0083 — the command finds the top node the way `where` does.
- If the answer to question 1 is "derived is enough", this issue shrinks to
  `loopboard recent`.
- A step added to the session loop is a workflow change (AGENTS.md, rule
  "If you change the workflow conventions"), unlike the optional issue
  fields of this project — hence the migration entry.
