---
id: 0017
title: Resolve conflicts when a device reconnects
category: task
status: todo
assignee: agent
project: 02-offline-mode
phase: 2
priority: 2
parent: 0016
labels: [sync]
created: {{today-7}}
---

## What needs to change

When two devices edited the same note offline, merge non-overlapping changes
and show both versions for the rest.

## Acceptance criteria

- [ ] Non-overlapping edits merge silently
- [ ] Overlapping edits show a "Two versions" banner
