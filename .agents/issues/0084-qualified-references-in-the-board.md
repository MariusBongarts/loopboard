---
id: 0084
title: Follow references to other harnesses in the board
category: user-story
status: todo
assignee: agent
project: 04-harness-tree
phase: 1
parent: 0082
labels: [ui, navigation, server]
created: 2026-10-13
---

## User story

As a **maintainer reading an issue, a PRD or a WIP**, I want **a reference
like `shop#0412` to be a link that shows the target's status and title and
opens it**, so that **I see whether the other side moved, and get there in
one click, without knowing where that harness lives**.

## Acceptance criteria

- [ ] `<id>#NNNN` in issue bodies, PRD and WIP documents and feed notes renders as a link with the target's status icon and title; clicking it opens that issue in its workspace
- [ ] `<id>#PNN` opens that harness with the project selected; `<id>:<path>` shows the resolved path with "Copy path"
- [ ] A reference that doesn't resolve — unknown id, no such number, folder missing — renders as plain text with an "unresolved" hint; clicking it does nothing and never navigates
- [ ] Targets come from the **harness index**: one light server read per harness that returns rows of frontmatter fields — id, title, status and path to start with — and never a body. Later issues add fields to it instead of adding routes, and rendering a link never loads another workspace's full data
- [ ] Plain `#NNNN` becomes a link in PRD and WIP documents too. Today only issue bodies and feed notes link it, and a document would otherwise show a linked foreign reference next to an unlinked local one
- [ ] In issue bodies and feed notes unqualified `#NNNN` behaves exactly as before; text in code, in existing links and in URLs is left alone; aliases work like ids
- [ ] Spec § 3 and § 5 gain the scenarios; an e2e test with two fixture workspaces covers an issue reference, a project reference and an unresolved one

## Out of scope

- Opening the file behind `<id>:<path>` — #0097, #0110
- Back-references ("mentioned in …") on the target — the blocker index in phase 3 (#0091) is the first reverse lookup
- Typing a reference with autocomplete in the editor — the `#` picker stays local
- Jumping to a reference from ⌘K — #0096

## Notes

- PRD story 20. Uses the parser from #0082, so the board and `check` agree on
  what a reference is.
- This issue owns the harness index the PRD names under "Cross-harness reads
  are light". The due list (#0086), blockers (#0091), the Overview (#0092),
  the switcher (#0094) and ⌘K (#0096) extend it, so shape it as rows per
  harness, not as link markup.
- Like the rest of phase 1 after #0078, this can follow the tree: a
  reference written before it lands is plain text, not broken — except in
  WIP notes and phase lists, which #0100 fixes.
- Also needs #0073: click handling and sanitising of rendered markdown are
  fixed there; build on that delegate rather than adding a second one.
- A link's status is a snapshot from when the page loaded; refresh it on
  window focus like the other cross-workspace data.
