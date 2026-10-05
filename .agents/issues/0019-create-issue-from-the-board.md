---
id: 0019
title: Create an issue from the board
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 5
parent: 0016
labels: [ui, capture]
created: 2026-10-04
---

## User story

As a **developer**, I want **to press `C` and create an issue (title, category, project, status, assignee) from its category template with the next free number**, so that **capturing an idea takes seconds and the file is shaped exactly like an agent would write it**.

## Acceptance criteria

- [x] `C` (and a "New issue" button) opens quick-create; defaults: category `task`, status `todo` (`backlog` when opened from the backlog drawer), assignee `agent`, project = the selected project
- [x] The server writes `NNNN-slug.md` from the category template, numbered by the branch-aware allocator; the slug comes from the title
- [x] The new issue appears via live updates and opens in the drawer
- [x] The document-store tests and a Playwright test cover creation

## Out of scope

- Editing the body during creation — the editor arrives in #0024/#0026

## Notes

- PRD story 24.

## Outcome

- `POST /api/w/:ws/issues` (`server/create.ts`) + `CreateIssueDialog`; `C` and the rail "+". The dialog's assignee option reads "You", matching "Needs you".
