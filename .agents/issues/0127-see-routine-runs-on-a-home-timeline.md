---
id: 0127
title: See routine runs on a Home timeline
category: user-story
status: todo
assignee: agent
project: 06-home-timeline
phase: 1
labels: [ui, home, routines]
created: 2026-10-29
---

## User story

As a **maintainer**, I want **a Home view in each workspace that lists what ran as a timeline grouped by day, each routine run with its time, name, status and a one-line summary**, so that **I see what happened while I was away without opening routines one by one**.

## Acceptance criteria

- [ ] `/w/:ws/home` shows Home; the rail lists Home as its first entry
- [ ] Runs of every routine are grouped under day headers ("Today", "Yesterday", "Tue 27 Oct"), newest first
- [ ] A run shows its time, routine title, a status tag unless it is ok, and its run summary: the note's first line, joined with the next when the first is shorter than 40 characters, clipped near 170 characters; a running run without a note reads "Running since HH:MM"
- [ ] A run that is ok, filed nothing and mentions nothing collapses to one line with the summary inline; others show the summary on its own line
- [ ] Today / 7 days / 30 days switch the period, remembered per browser
- [ ] Empty states: no routines (how to add one) and nothing in the period
- [ ] Vitest for the timeline module: grouping, order, period start, summary rules, collapse rule

## Out of scope

- Issues under runs (#0128), side column (#0129), previews (#0130)

## Notes

- PRD stories 1–5, 10, 23, 25. One pure timeline module; the view only renders.
