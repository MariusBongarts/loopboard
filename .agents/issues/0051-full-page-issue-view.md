---
id: 0051
title: Open an issue as a full page with its own URL
category: user-story
status: done
assignee: agent
project: 02-linear-like-ux
phase: 3
parent: 0050
labels: [ui, navigation]
created: 2026-10-05
---

## User story

As a **maintainer**, I want to expand an issue into a full page at its own URL, so that I can focus on it or share the link.

## Acceptance criteria

- [x] `/w/:ws/issues/:id` renders the same issue view: body left, properties right
- [x] Expand button in the panel; back returns to where I was; ⌘K and Needs you can open it
- [x] Unknown ids show a clear "No issue #NNNN" state with a way back
- [x] Spec § 5 scenario and e2e
