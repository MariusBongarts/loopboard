---
id: 0098
title: Add a Home tab with INDEX.md, AGENTS.md and the identity
category: user-story
status: backlog
assignee: agent
project: 04-harness-tree
phase: 4
parent: 0097
labels: [ui, workspaces]
created: 2026-10-13
---

## User story

As a **maintainer opening a harness I haven't touched for months**, I want **a
Home tab that shows what the harness is, where it sits in the tree, its
`INDEX.md` and its `AGENTS.md`**, so that **I see what it's for and where
things are without opening my editor**.

## Acceptance criteria

- [ ] Every workspace has a Home view showing its identity — name, id, aliases, kind, type, the purpose paragraph, its parent as a link and its children — and the harness folder's `INDEX.md` and `AGENTS.md`, rendered read-only
- [ ] An index node opens on Home, replacing the plain page from #0081
- [ ] Links inside `INDEX.md` and `AGENTS.md` behave as in #0097: a relative markdown file opens in the document view, a broken link is marked, qualified references resolve; other files offer Open and Reveal once #0110 has landed
- [ ] A missing `INDEX.md` or `AGENTS.md` shows one line saying what the file is for, and a harness without an identity file shows a hint naming the migration — neither is an error
- [ ] The two files are read through a route limited to those names in a registered harness folder; each offers "Copy path" and "Open in editor"; the view refetches on window focus
- [ ] Spec § 7 gains the scenarios; an e2e test opens Home on the fixture's index node and follows a link from its `INDEX.md` to a child harness

## Out of scope

- Editing `INDEX.md`, `AGENTS.md` or the identity file in the board
- Generating or updating `INDEX.md` — agents and people write it
- Rendering the managed workflow block specially — it is shown as the markdown it is
- A Home view across harnesses — that is the Overview (#0092)

## Notes

- PRD story 49. `INDEX.md` and `AGENTS.md` sit in the harness folder, one
  level above the root loopboard reads, which is why nothing shows them
  today.
- Where Home sits (a rail entry, a tab next to Board / PRD / WIP) is a design
  call; follow the Brand Kit and keep the rail short (#0074).
- The file watcher only covers the root, so a change to `INDEX.md` arrives on
  the next focus, not live.
