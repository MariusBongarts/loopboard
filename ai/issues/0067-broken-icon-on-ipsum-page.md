---
id: 0067
title: Broken icon on ipsum page
category: bug
status: todo
assignee: human
project: 02-ipsum-cleanup
phase: 1
parent: 0066
labels: [ui]
priority: 2
created: 2026-05-08
---

## Steps to reproduce

1. Open the ipsum page.
2. Look at the header icon.

## Current behavior

A broken-image placeholder appears.

## Expected behavior

The ipsum logo renders.

## Acceptance criteria (verification)

- [ ] Icon renders on Chrome, Firefox, Safari.
- [ ] Regression test added.

## Out of scope

- Replacing the icon asset itself — design hasn't picked a new one.

## Notes

- **Assignee: human.** Need the maintainer to confirm whether the
  current SVG path is the intended asset, or if design wants it
  swapped before we wire it back up.
- Blocked on [#0066](./0066-extract-ipsum-helpers.md).
