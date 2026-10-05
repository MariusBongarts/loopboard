---
id: 0052
title: Change status, assignee, labels, project and parent in place
category: user-story
status: done
assignee: agent
project: 02-linear-like-ux
phase: 3
parent: 0050
labels: [ui, server]
created: 2026-10-05
---

## User story

As a **maintainer**, I want small pickers for an issue's properties, so that I change metadata without Edit mode.

## Acceptance criteria

- [x] One `Menu` primitive: anchored, arrow keys, type-to-filter, Esc; used for every picker
- [x] Status, assignee, labels (multi, create new), project, parent pickers in the issue view
- [x] The issue PATCH accepts `labels`, `project`, `parent`; line-level edits keep comments and order; invalid values are 400
- [x] Optimistic updates, rolled back with the error banner on failure
- [x] Vitest for PATCH validation/edits; spec § 4 scenarios and e2e that check the file on disk

## Out of scope

- Context menus (#0055)

## Notes

- `priority` stays board order — no priority picker.
