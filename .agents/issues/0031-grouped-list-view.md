---
id: 0031
title: Browse issues in a grouped list view
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 7
labels: [ui, views]
created: 2026-10-04
---

## User story

As a **developer with hundreds of issues**, I want **a dense list view next to the board, grouped by status, project or label and filterable**, so that **large repos stay scannable**.

## Acceptance criteria

- [x] A Board/List toggle on the project pane and on the standalone issues view
- [x] List rows show id, title, status, assignee, labels, project and created; keyboard navigation with `j`/`k`
- [x] Group by status, project or label; filter by assignee, label and status
- [x] Renders 800+ issues smoothly (virtualized if needed)
- [x] Playwright covers grouping and filtering

## Out of scope

- Saving views — #0032

## Notes

- PRD story 40.

## Outcome

- `/w/:ws/issues` (`ListView` + `IssueList`, `src/list.ts`): group by status (board order) / project / label / none, assignee, status chips, label, text; filters in the URL; `j`/`k` + Enter. The project pane has a Board/List toggle (remembered).
- Decision (see wip questions): the rail now lists destinations only — Inbox, Needs you, Issues (list), Projects, Specs; "Sessions" and "Issues" as feed filters live on as the feed's chips.
