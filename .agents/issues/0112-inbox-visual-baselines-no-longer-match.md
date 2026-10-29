---
id: 0112
title: The inbox visual baselines no longer match the board
category: bug
status: todo
assignee: agent
labels: [testing, ui]
created: 2026-10-13
---

## Steps to reproduce

1. On macOS, run `pnpm test:e2e` (or only `pnpm exec playwright test visual.spec.ts`).

## Current behavior

The run ends red: "inbox and board — light" and "inbox and board — dark" in
[`visual.spec.ts`](../../tests/e2e/visual.spec.ts) fail against
`inbox-light-darwin.png` and `inbox-dark-darwin.png`. In the last full run,
made when the six issues that precede project 04 were brought together,
these two failed and the other 94 tests passed; the same two failed before
that work. What that session recorded as the causes:

- At the test's 1440 px width the board toolbar wraps onto a second line
  since the You and Agent filters got avatars; the baselines show it on one.
- The demo fixture keeps a malformed issue file, so since #0071 the rail of
  every workspace screen ends with "1 file skipped". The inbox baselines
  don't show that row either.

A red suite hides the next real regression, and nobody owned this one: it was
only mentioned in project 04's activity log and in #0071's notes.

## Expected behavior

`pnpm test:e2e` is green on macOS, and the inbox baselines show the screen as
it is meant to look.

## Acceptance criteria (verification)

- [ ] It is decided whether the toolbar may wrap at 1440 px. If not, the toolbar is fixed; the baselines are not bent around a layout bug
- [ ] `inbox-light-darwin.png` and `inbox-dark-darwin.png` are refreshed and show the "1 file skipped" row
- [ ] The other baselines with the board in view (panel, menu, editor, palette) are compared with the current screens and refreshed where they differ
- [ ] `pnpm test:e2e` passes on macOS
- [ ] Regression test added at the right seam (or absence of seam documented)

## Out of scope

- Visual baselines for Linux and Windows: the file skips those platforms

## Notes

- Found in the review of the six issues before project 04. Which baselines
  were refreshed for the skipped-files row, and why the rest were left, is in
  #0071's notes.
- Refreshed baselines need a look by the maintainer before this is `done`:
  hand over as `in-review`.

- 2026-10-29: the rail gained a Home entry (project 06); the inbox baselines
  now differ for that too. The other visual baselines were re-recorded then.
