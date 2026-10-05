---
id: 0050
title: Turn the issue drawer into a resizable panel with previous / next
category: user-story
status: done
assignee: agent
project: 02-linear-like-ux
phase: 3
parent: 0048
labels: [ui]
created: 2026-10-05
---

## User story

As a **maintainer**, I want issues to open in a side panel I can resize and step through, so that I can review a column or list without closing it.

## Acceptance criteria

- [x] The panel replaces the drawer; restyled header (status icon, id, title), properties row, relations, history, body
- [x] Opening from the board, list or feed passes that order; ‹ › buttons and `j`/`k` step through it
- [x] Width resizable and remembered (#0048); Esc closes; no backdrop dims the board
- [x] Spec § 5 updated; e2e for prev/next and resize

## Out of scope

- Full page (#0051)
