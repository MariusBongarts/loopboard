---
id: 0027
title: Edit PRDs, WIPs and specs in the same editor
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 6
parent: 0026
labels: [editor, ui]
created: 2026-10-04
---

## User story

As a **developer**, I want **the PRD, WIP and spec tabs to use the same editor as issues**, so that **every document loopboard shows is editable in place**.

## Acceptance criteria

- [x] PRD and WIP tabs on the project pane get Edit, with the same conflict handling
- [x] Spec documents are editable from the Specs view; coverage percentages recompute after save
- [x] The document header (`> Drafted:`, `> Status:`) is preserved byte-exact unless edited
- [x] Playwright covers editing a WIP current-focus paragraph

## Out of scope

- Architecture docs and rules — they aren't rendered in loopboard today

## Notes

- PRD story 34.

## Outcome

- "Edit PRD" / "Edit WIP" on the project tabs and "Edit spec" in the Specs view; coverage recomputes through live updates.
