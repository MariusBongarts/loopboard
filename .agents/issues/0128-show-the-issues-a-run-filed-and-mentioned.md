---
id: 0128
title: Show the issues a run filed and mentioned, with sessions and hand-filed issues
category: user-story
status: done
assignee: agent
project: 06-home-timeline
phase: 1
parent: 0127
labels: [ui, home, routines]
created: 2026-10-29
---

## User story

As a **maintainer**, I want **the issues a run filed listed under it and the ones it mentioned as chips, with project sessions and issues filed by hand on the same timeline**, so that **I see where new work came from and Home covers all activity**.

## Acceptance criteria

- [x] An issue counts as filed by a run when the run's note references it and it was created on the run's local day, or when its `recurrence` names the run's `creates: issue` routine and it was created that day; other existing references are mentioned
- [x] Filed issues sit under their run with status icon, id, title and project; mentioned ones are quiet chips
- [x] An issue shown under a run is not repeated as its own entry; archived issues never show
- [x] Project sessions and live issues created in the period are timeline entries; on one day runs come first, then sessions, then issues
- [x] The workspace data passes `recurrence` through on issues
- [x] Vitest: same day, other day, missing issue, recurrence, de-duplication

## Out of scope

- Recording filed issues in `runs.md` (PRD out of scope)

## Notes

- PRD stories 6–9.
