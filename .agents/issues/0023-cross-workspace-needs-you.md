---
id: 0023
title: See what needs me across all workspaces
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 5
parent: 0008
labels: [ui, workspaces]
created: 2026-10-04
---

## User story

As a **developer with several repos**, I want **a "Needs you" view across all workspaces (human-assigned, not done; plus blocked), grouped by repo**, so that **nothing waiting on me hides in a repo I didn't open today**.

## Acceptance criteria

- [x] A switcher entry "All workspaces · Needs you" shows items from every available workspace, grouped by repo, newest first
- [x] Clicking an item switches to its workspace with the item selected
- [x] Unavailable workspaces are listed as skipped, not as errors
- [x] The view reads workspaces in parallel and stays responsive with the maintainer's repo sizes (800+ issues)
- [x] Playwright with two fixture workspaces

## Out of scope

- Live-watching every workspace — this view refetches on open and on focus

## Notes

- PRD story 28.

## Outcome

- `GET /api/needs-you` + `/needs-you` view; switcher entry; `?item=` deep link selects the issue; refetch on window focus.
