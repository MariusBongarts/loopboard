---
id: 0009
title: Add, rename and remove workspaces in the UI
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 2
parent: 0008
labels: [workspaces, ui]
created: 2026-10-04
---

## User story

As a **developer**, I want **to add a workspace by pasting a repo path with folder suggestions as I type, and to rename or remove workspaces**, so that **I manage my repos without the terminal**.

## Acceptance criteria

- [x] "+ Add workspace…" in the switcher opens a path input; the server suggests subfolders as you type (`~` expands)
- [x] Choosing a folder runs root detection; folders without a root show the setup hint (#0015 later turns this into the full empty state)
- [x] "Manage workspaces" lets you rename and remove entries; removing never touches files on disk
- [x] The folder-suggestion endpoint only lists directory names, never file contents
- [x] Playwright covers add → switch → remove

## Out of scope

- Auto-discovering repos by scanning the disk — rejected in the PRD

## Notes

- PRD stories 8, 9. Browsers can't return absolute paths from a native picker, so the server-side suggest is the picker.

## Outcome

- Add dialog with server-side folder suggestions (`GET /api/fs/suggest`), keyboard pick, root-less folders explained; Manage dialog with rename and confirmed remove. Both on a new shared `BaseDialog` (the wontfix modal moved onto it).
