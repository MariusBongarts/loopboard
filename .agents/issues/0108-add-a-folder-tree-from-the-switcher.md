---
id: 0108
title: Add a folder tree from the switcher
category: user-story
status: backlog
assignee: agent
project: 04-harness-tree
phase: 3
parent: 0095
labels: [ui, workspaces]
created: 2026-10-13
---

## User story

As a **maintainer who lives in the board, not the terminal**, I want **"Add
folder tree…" in the workspace switcher**, so that **I register a tree of
harnesses the same way I add a single workspace**.

## Acceptance criteria

- [ ] "Add folder tree…" in the switcher asks for a folder, shows the nodes the scan found — name, id, kind, parent, and whether each is new or already registered — and registers the new ones after a confirmation
- [ ] The dialog goes through the scan from #0095 and follows its rules: the home directory and a file-system root are refused with the same sentence, only identity files are read, and nothing is registered before the confirmation
- [ ] The scan runs only when the user asks — never on page load or in the background — and its route is guarded like the other workspace writes
- [ ] Spec § 7 gains the scenario; an e2e test adds a fixture tree and finds its nodes in the switcher

## Out of scope

- The ADR and the CLI command — #0095
- A "Rescan" action on a registered tree — deferred in `wip.md`; add the folder again instead
- A native folder picker — the path is typed or pasted, as in "Add workspace"

## Notes

- PRD story 44. Split from #0095 in the review round: the ADR and the
  command are one slice, the dialog is another.
- The "Add workspace" dialog is the prior art for the path field and its
  error messages.
