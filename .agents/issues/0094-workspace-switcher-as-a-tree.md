---
id: 0094
title: Show the workspace switcher as a tree
category: user-story
status: wontfix
assignee: agent
project: 04-harness-tree
phase: 3
parent: 0092
labels: [ui, workspaces, navigation]
created: 2026-10-13
---

## Why rejected

Moved out of loopboard on 2026-10-14
([ADR-0009](../architecture/decisions/0009-views-over-a-tree-live-outside-loopboard.md)).
The switcher as a tree — like every view over a whole tree of harnesses — belongs to a
tool built on the same files, not to the board. loopboard stays a board per
harness, for code and for documents, and keeps those files readable for
such tools: the identity file, the reserved fields, `workspaces --json` and
stable URLs (#0113). The text below stays as the record of what was
planned.

## User story

As a **maintainer with ten harnesses, two of them called "taxes"**, I want
**the switcher to show the tree, tell same-named nodes apart and count what's
open**, so that **changing context stays one glance and one click**.

## Acceptance criteria

- [ ] The switcher indents nodes by `parent`; index nodes are rows you can open; the order follows the tree, then the name, and doesn't change between openings
- [ ] Two nodes with the same display name show their parent's name next to it
- [ ] Each harness shows its open issues and "Needs you" instead of the number of issue files; the counts come from the harness index (#0084) and the menu opens without waiting for them
- [ ] A secondary checkout (#0080) sits under its harness, labelled with its branch or folder
- [ ] Nodes whose folder is missing sit at the bottom, marked as today; the menu keeps the keyboard behaviour it has today
- [ ] Spec § 7 scenario "Switch workspace from the top-left" is updated; e2e on the fixture tree; visual baselines refreshed in both themes

## Out of scope

- Registering a folder tree — #0095, #0108
- A type-to-filter field in the menu — ⌘K already switches workspaces by name; deferred in `wip.md`
- Collapsing branches of the tree and remembering that — add it when a tree is big enough to need it
- Drag-and-drop to change a node's parent — `parent` is edited in the identity file

## Notes

- PRD story 43. This re-states an earlier answer (project 01, question 9:
  "keep the file count"). The reason then was cost — a full read per
  workspace; the harness index removes it.
- A workspace without an identity file has no parent and sits at the top
  level, exactly as every workspace does today.
