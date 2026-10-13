---
id: 0065
title: Make the six explainer videos for the course
category: task
status: in-review
assignee: human
project: 03-help-center
phase: 2
parent: 0064
labels: [videos, content]
created: 2026-10-05
---

## What needs to change

Six short compositions (12–25 s each): files are the agent's memory, what a
skill is, grill me, vertical slices, the issue loop, steering from the board.
Each renders in both themes with a poster.

## Why

Each course chapter (#0066) gets a visual that explains its idea before the
prose does.

## Acceptance criteria

- [x] Six compositions, on-screen text in plain words (Brand Kit voice), eased motion, nothing bounces
- [x] Rendered MP4 + poster for each in light and dark; the set stays under 6 MB
- [x] A unit test checks every course chapter's video exists in both themes with a poster

## Notes

- PRD stories 15–16.

## Review

Watch the six videos (Help → Working with AI agents, both themes — Settings
toggles the theme). Check that the on-screen copy says what you'd say, that
the pacing is calm enough to read at the size the page shows them, and
nothing looks off. To change one: `pnpm videos:studio`, edit
`videos/src/scenes/`, then `pnpm videos` and look at the new posters.
