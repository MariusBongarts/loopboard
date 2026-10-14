---
id: 0081
title: Register index nodes — folders that group harnesses but hold no issues
category: user-story
status: wontfix
assignee: agent
project: 04-harness-tree
phase: 1
parent: 0079
labels: [server, workspaces, ui]
created: 2026-10-13
---

## Why rejected

Moved out of loopboard on 2026-10-14
([ADR-0009](../architecture/decisions/0009-views-over-a-tree-live-outside-loopboard.md)).
Index nodes — like every view over a whole tree of harnesses — belong to a
tool built on the same files, not to the board. loopboard stays a board per
harness, for code and for documents, and keeps those files readable for
such tools: the identity file, the reserved fields, `workspaces --json` and
stable URLs (#0113). The text below stays as the record of what was
planned.

## User story

As a **maintainer building a tree — a company above two code repos, a
"private" node above taxes and a wedding**, I want **a folder with only an
identity file and an `INDEX.md` to be registrable**, so that **the tree has
named inner nodes without an empty issues folder pretending to be a board**.

## Acceptance criteria

- [ ] A folder whose `.agents/harness.md` says `kind: index` registers without an `issues/` folder (today: "No .agents/ or ai/ folder with issues/ found")
- [ ] Root detection keeps its order — `.agents/issues`, then `ai/issues` — and an identity file never wins over an existing root. Only when neither exists does a `kind: harness` folder register, with an empty board at `.agents/`
- [ ] Opening an index node shows its name, its purpose paragraph, its parent and the registered nodes that name it as `parent` — no board, no feed, no create-issue action
- [ ] Index nodes are never errors elsewhere: the cross-workspace "Needs you" leaves them out, and the harness table in Help → Upgrade lists them as index nodes instead of "No AGENTS.md" or "N behind"
- [ ] A `parent` that names an id nobody registered shows as "parent not registered" on the node's page, never as an error
- [ ] Vitest for registration and the API shape of an index node, and for the legacy `ai/` fixture with an identity file in `.agents/` — it must still show its issues; an e2e test opens an index node; spec § 7 gains the scenarios

## Out of scope

- `loopboard init --kind index`, and what `next-id`, `check` and creating an issue answer on an index node — #0104
- Rendering `INDEX.md` in the board — the Home tab (#0098)
- The tree in the switcher and on the Overview — #0094, #0092
- Registering a folder tree in one step — #0095
- Checking the links inside `INDEX.md` — #0097

## Notes

- PRD stories 5, 6. An index node has no workflow block: it is an identity
  and a table of contents, and agents working below it read its `INDEX.md`.
- The identity file is a second way in, not a replacement (ADR-0003). The
  case to keep safe is a legacy harness: the migration puts
  `.agents/harness.md` next to `ai/issues`, and a registration that took
  `.agents/` for the root because the file is there would show an empty
  board.
- The page for an index node can be plain: #0098 replaces it with the Home
  tab.
- Until #0104 lands, an index node is created by writing the two files by
  hand.
