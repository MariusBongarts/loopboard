---
id: 0129
title: See routine health, Needs you and projects beside the timeline
category: user-story
status: done
assignee: agent
project: 06-home-timeline
phase: 1
parent: 0127
labels: [ui, home]
created: 2026-10-29
---

## User story

As a **maintainer**, I want **a side column with every routine's health, what needs me and the projects that moved**, so that **I know at a glance whether the autopilot works and where to go next**.

## Acceptance criteria

- [x] Routine health lists every routine: last-run status dot, title, a strip of recent runs, the next slot or "Paused", and the time of the last run
- [x] Needs you lists the first five issues that need you (in review first) with a link to the Needs you view
- [x] Projects lists the four most recently worked-on projects with their last session day
- [x] Below 1000px the column moves above the timeline
- [x] Vitest: health rows for paused, running, no runs and next slot; Needs you order

## Out of scope

- Actions on routines (read-only like the Routines view)

## Notes

- PRD stories 12, 13, 25.
