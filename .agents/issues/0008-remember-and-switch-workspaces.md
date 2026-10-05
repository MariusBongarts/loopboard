---
id: 0008
title: Remember workspaces and switch between them from the top-left
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 2
parent: 0007
labels: [workspaces, ui, server]
created: 2026-10-04
---

## User story

As a **developer with several repos**, I want **one running loopboard to remember every repo I opened and switch between them from the top-left corner**, so that **I stop juggling ports, terminal tabs and per-repo scripts**.

## Acceptance criteria

- [x] A per-user registry (XDG config dir; `%APPDATA%` on Windows) stores `{ id, name, repoPath, root }`
- [x] Starting the CLI registers the repo (deduplicated by path) and selects it; if a loopboard server is already running, the CLI hands the repo to it and opens its URL instead of starting a second server
- [x] API routes are workspace-scoped (`/api/w/:id/…`); client URLs are `/w/:id/…` via a router
- [x] The top-left switcher lists workspaces with open-issue counts; choosing one loads it and updates the URL
- [x] A workspace whose folder disappeared shows as unavailable instead of crashing
- [x] Vitest covers the registry (add, dedupe, missing folder); Playwright covers switching

## Out of scope

- Adding/removing workspaces from the UI — #0009
- Cross-workspace views — #0023

## Notes

- PRD stories 5, 6, 7, 10. Per-browser UI state (pins, last selection) becomes per-workspace.

## Outcome

- Registry, root detection and routes in `server/workspaces.ts` + `server/handler.ts`; client routing via `vue-router` (`/w/:ws`, `/w/:ws/specs`), `WorkspaceView` + `WorkspaceSwitcher`.
- Per-workspace browser storage through `src/storage.ts` with a one-time fallback to the old `tracker.*` keys.
- Specs § 1 and § 7; e2e in `tests/e2e/07-workspaces.spec.ts` against two fixture repos (`.agents/` and legacy `ai/`).
