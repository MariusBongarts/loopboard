---
id: 0028
title: Show blocking relations and sub-issues
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 7
labels: [ui, structure]
created: 2026-10-04
---

## User story

As a **developer**, I want **each issue to show what blocks it and what it blocks, with sub-issue progress and a warning on a todo whose parent isn't done**, so that **I (and my agents) pick work that is actually unblocked**.

## Acceptance criteria

- [x] The drawer shows "Blocked by #NNNN" (from `parent:`) and "Blocks #…" (reverse lookup), each with its status
- [x] An issue that others point to shows a sub-issue checklist with done/total
- [x] Cards whose parent isn't `done` show a blocked badge; the board filter can hide them
- [x] Links to missing or archived issues render clearly
- [x] Unit tests for the relation index; Playwright for the drawer section

## Out of scope

- New relation types or schema fields — `parent:` is the only relation

## Notes

- PRD stories 36, 37.

## Outcome

- `src/relations.ts` (unit-tested) shared through the workspace context; drawer Relations strip, card "waiting on" badge, "Hide waiting N" board toggle.
