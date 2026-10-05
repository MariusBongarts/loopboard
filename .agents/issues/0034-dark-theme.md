---
id: 0034
title: Add a dark theme
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 8
parent: 0033
labels: [design, ui]
created: 2026-10-04
---

## User story

As a **developer**, I want **a dark theme that follows my system setting, with a manual toggle**, so that **loopboard fits the rest of my setup**.

## Acceptance criteria

- [x] Dark values for every token, applied through `prefers-color-scheme` and overridable by a light/dark/system toggle remembered per browser
- [x] Status and project colors keep WCAG AA contrast in both themes
- [x] The Brand Kit shows both themes
- [x] Playwright covers the toggle; screenshots in both themes are reviewed in the PR

## Out of scope

- Custom user themes

## Notes

- PRD story 42.

## Outcome

- Dark tokens + `data-theme` (inline pre-paint script, `src/theme.ts`), rail toggle and ⌘K; `scripts/contrast.mjs` (in `pnpm verify`) — fixing light-theme failures on the way (`ink-4`, `ember-deep`, new `rose-deep`). Visual regression baselines for the main screens in both themes.
