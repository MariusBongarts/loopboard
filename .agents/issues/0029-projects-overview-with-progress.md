---
id: 0029
title: Track project progress on a projects overview
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 7
labels: [ui, structure]
created: 2026-10-04
---

## User story

As a **developer**, I want **a projects overview listing every project with its progress (overall and per wip.md phase), status, last session and the count needing a human**, so that **I see where every project stands at a glance**.

## Acceptance criteria

- [x] `/w/:id/projects` lists projects grouped by status (active, paused, shipped)
- [x] Each row shows a done/total bar (wontfix counts as closed), per-phase bars from the wip.md phase headings, last session date and the human-assigned count
- [x] Clicking a project opens its board
- [x] Phase parsing has unit tests against fixture WIPs (including WIPs without phases)

## Out of scope

- Timelines, Gantt charts and target dates — projects carry no dates beyond sessions

## Notes

- PRD story 38.

## Outcome

- `/w/:ws/projects` (`ProjectsView`, `src/projects.ts`); rail entry and ⌘K. Real-repo check found WIPs with dated headings under Phases — the parser skips them.
