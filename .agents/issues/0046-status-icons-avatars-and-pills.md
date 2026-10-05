---
id: 0046
title: Show status icons, assignee avatars, label pills and project badges everywhere
category: user-story
status: done
assignee: agent
project: 02-linear-like-ux
phase: 1
parent: 0045
labels: [ui]
created: 2026-10-05
---

## User story

As a **maintainer**, I want statuses as small Linear-style icons and assignees as avatars, with quiet label pills and project badges, so that I can scan state and ownership at a glance.

## Acceptance criteria

- [x] `StatusIcon` draws backlog, todo, in progress, in review, done, blocked and wontfix by shape and color
- [x] `Avatar` for agent and human; `LabelPill` (dot + name); `ProjectBadge` (tone square + name)
- [x] Cards, list rows, feed rows, the issue view, Needs you and the palette use them instead of text chips
- [x] lucide icons bundled and credited in CREDITS.md

## Out of scope

- Layout changes of cards/rows (Phase 4)

## Notes

- Status icons are our own SVG; lucide covers UI glyphs.
