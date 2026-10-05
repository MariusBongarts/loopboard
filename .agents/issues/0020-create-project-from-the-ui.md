---
id: 0020
title: Create a project from the UI
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 5
parent: 0019
labels: [ui, capture]
created: 2026-10-04
---

## User story

As a **developer**, I want **to create a project (title → `NN-slug/` with `prd.md` and `wip.md` from the templates)**, so that **I can open a PRD without asking an agent first**.

## Acceptance criteria

- [x] "New project" (rail and ⌘K once #0021 lands) asks for a title
- [x] The server writes `prd.md` and `wip.md` from the templates, with the drafted date and a kickoff activity-log entry; the number comes from the allocator
- [x] The project appears in the rail and opens on its PRD tab
- [x] Playwright covers creation

## Out of scope

- Generating PRD content — that is the to-prd skill's job; "Copy agent prompt" (#0022) bridges to it

## Notes

- PRD story 25.

## Outcome

- `POST /api/w/:ws/projects`; the rail's projects section "+" and ⌘K; the new project opens on its PRD tab once live data has it.
