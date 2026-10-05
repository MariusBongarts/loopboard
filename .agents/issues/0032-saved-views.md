---
id: 0032
title: Save filtered views per workspace
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 7
parent: 0031
labels: [ui, views]
created: 2026-10-04
---

## User story

As a **developer**, I want **to save the current layout, grouping and filters as a named view per workspace**, so that **recurring questions like "bugs in review" are one click**.

## Acceptance criteria

- [x] "Save view" stores name, layout, grouping and filters per workspace in the user config (not in the repo)
- [x] Saved views appear in the rail under the workspace and in ⌘K
- [x] Rename and delete views
- [x] Views referencing a removed label or project still open, with that filter shown as stale
- [x] Playwright covers save → reload → open

## Out of scope

- Sharing views via the repo — views are personal

## Notes

- PRD story 41.

## Outcome

- `GET/PUT /api/w/:ws/views` in the user config; a view is a name + the list's query. Rail "Views" section, ⌘K group, Save / Rename & update / Delete in the list header; a vanished label shows as "(no issues)".
