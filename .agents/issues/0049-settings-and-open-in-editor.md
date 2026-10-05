---
id: 0049
title: Add Settings (theme, editor) and open issues in VS Code or Cursor
category: user-story
status: done
assignee: agent
project: 02-linear-like-ux
phase: 2
parent: 0047
labels: [ui]
created: 2026-10-05
---

## User story

As a **maintainer**, I want to pick my editor once and open any issue file in it with one click, so that I jump straight to the source.

## Acceptance criteria

- [x] Settings dialog from the rail and ⌘K: Theme (System / Light / Dark) and Editor (None / VS Code / Cursor)
- [x] "Open in editor" in the issue view (the context menu gets it in #0055) links to `vscode://file/…` or `cursor://file/…` with the absolute path
- [x] Hidden when Editor is None; a ⌘K command exists when set
- [x] Vitest for the URL builder; spec § 14 (settings) and § 5 (open in editor) with e2e
