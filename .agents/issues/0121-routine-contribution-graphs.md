---
id: 0121
title: See a year of runs as a contribution graph
category: user-story
status: done
assignee: agent
project: 05-routines
phase: 2
parent: 0120
labels: [ui, routines]
created: 2026-10-27
---

## User story

As a **maintainer**, I want **a GitHub-style graph per routine and one for the
whole workspace — a cell per day for a year — that shows runs, failures and
missed slots**, so that **gaps and failures stand out at a glance**.

## Acceptance criteria

- [x] The server computes each routine's days for 53 weeks ending today in the routine's zone: red when a run failed or was aborted, else green in four shades relative to the busiest day when runs finished, else grey when a slot was missed or expired — recorded, or a past slot of an enabled routine since its `created` day without an entry — else empty; `list --json` carries the days
- [x] The Routines view shows the workspace graph on top (every routine summed the same way) and each routine's graph on its page; 53 columns × 7 rows, Monday on top, month labels, a legend
- [x] Hovering or focusing a cell names the day and its runs with time, status and note; cells have accessible labels
- [x] The graph colors are tokens in both themes, and the contrast script checks the state colors at 3:1 against the background in light and dark
- [x] Vitest for the day states; Playwright for the cells and their hover text

## Out of scope

- A graph across harnesses — that's the private dashboard (ADR-0009)

## Notes

- PRD "Board" (graphs), stories 26 and 27.
