---
id: 0066
title: Extract ipsum helpers
category: task
status: todo
assignee: agent
project: 02-ipsum-cleanup
phase: 1
labels: [refactor]
priority: 1
created: 2026-05-08
---

## What needs to change

Pull the three duplicate parsing blocks out of the ipsum module into a
single `parseIpsum()` helper.

## Why

The duplication is what makes the icon bug hard to fix in one place —
see [#0067](./0067-broken-icon-on-ipsum-page.md).

## Acceptance criteria

- [ ] Helper exists with unit tests.
- [ ] Call sites updated; no duplicate parsing left.

## Out of scope

- The bug fix itself — that's the next slice.
