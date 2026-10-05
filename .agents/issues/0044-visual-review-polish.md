---
id: 0044
title: Visual review — board overflow hint, list chips, relation dots, tighter baselines
category: task
status: done
assignee: agent
project: 01-open-source-launch
phase: 8
labels: [ui, testing]
created: 2026-10-05
---

## What needs to change

Fixes from a visual review of the baselines and the dogfood board:

- With the feed open, In review and Done sit off-screen with nothing saying
  so. The board fades the edge that hides columns.
- List rows rendered project and label chips in 13px sans, unlike every
  other chip. They use the card chips' mono size now.
- The drawer's "Blocks" rows used a square that looked like a checkbox right
  next to the body's real checkboxes. It is a round status dot now.
- The board tools wrapped "Backlog N" onto a second row at 1440 px with the
  feed open. The filter box now gives up width first.
- Visual baselines were stale yet passing: the 1% tolerance hid a stray
  bullet and a changed count. Tolerance is 0.2% and the baselines are fresh.

## Acceptance criteria

- [x] Spec § 3 "Columns out of view are hinted" + e2e
- [x] Baselines regenerated and reviewed in both themes

## Notes

- The fade is a CSS mask driven by `src/overflow.ts`.
