---
id: 0096
title: Search every harness from ⌘K and jump to a qualified reference
category: user-story
status: backlog
assignee: agent
project: 04-harness-tree
phase: 3
parent: 0092
labels: [ui, navigation]
created: 2026-10-13
---

## User story

As a **keyboard user who remembers a title but not the harness it lives in**,
I want **⌘K to find issues and projects in every harness, and typing
`shop#0412` to jump straight there**, so that **I never have to switch
workspace first to find something**.

## Acceptance criteria

- [ ] ⌘K finds issues and projects from every registered harness, grouped by harness, with the current workspace's results first
- [ ] Typing a qualified reference offers a direct jump as the first result: `<id>#NNNN` to the issue, `<id>#PNN` to the project; aliases work
- [ ] Choosing a result from another harness switches workspace with that issue or project selected
- [ ] Results from other harnesses come from the harness index (#0084: id, title, status, labels — no bodies); the palette opens at once and adds them when they arrive
- [ ] Commands, the current workspace's results and their ranking stay as they are; other harnesses add at most a handful of rows each until the query narrows
- [ ] Unit tests for ranking with foreign results; an e2e test with two fixture workspaces; spec § 11 updated

## Out of scope

- Searching issue bodies across harnesses — titles, ids and labels only; body search is per workspace (#0075 moves it to the server)
- Searching people and organisations from ⌘K — a small follow-up once their pages exist (#0106)
- Actions on a foreign issue (change status, copy prompt) — open it first

## Notes

- PRD story 46. Today the palette offers "Switch to …" for other workspaces
  and searches issues, projects and specs of the open one only.
- Also needs #0082: the direct jump recognises a reference with the shared
  parser.
- Archived issues stay out, as they do today.
