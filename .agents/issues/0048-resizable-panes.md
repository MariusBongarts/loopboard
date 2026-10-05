---
id: 0048
title: Resize the rail, feed and issue panel
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

As a **maintainer**, I want to drag-resize the rail, the feed and the issue panel, each remembered and reset by double-click, so that I can fit my screen.

## Acceptance criteria

- [x] One resize composable used by the rail, the feed and the issue panel
- [x] Pointer drag, arrow keys on a focused separator, double-click resets; widths clamped and stored per browser
- [x] Spec § 2 resize scenario generalized; e2e for feed and panel resize

## Notes

- Replaces the rail's own resize code.
