---
id: 0120
title: See routines and their runs in a Routines view
category: user-story
status: done
assignee: agent
project: 05-routines
phase: 2
parent: 0116
labels: [ui, routines]
created: 2026-10-27
---

## User story

As a **maintainer**, I want **a Routines view in each workspace that lists
every routine with its schedule in words, next slot and last run, and a page
per routine with its steps and runs**, so that **I see what runs and whether
it worked without opening files**.

## Acceptance criteria

- [x] `GET /api/w/:id/routines` returns what `routines list --json` returns for that harness; `/data` carries the number of routines
- [x] `/w/:ws/routines` lists each routine: title, schedule in words with its zone, next slot, last run with a status pill and relative time, paused and invalid routines marked; an empty state says how to create one
- [x] `/w/:ws/routines/:slug` shows the settings (schedule, zone, expiry, timeout, host, writes-to, creates), the rendered steps and every run newest first with status, times and note
- [x] The rail lists Routines under Workspace in a harness with at least one routine; ⌘K "Go to Routines" always works; the view follows file changes live
- [x] Read-only: nothing in the view writes
- [x] Spec § 15 scenarios with Playwright tests against a temp harness served by the built binary; the demo fixture stays without routines

## Out of scope

- The graphs (#0121); pause or run buttons (PRD out of scope)

## Notes

- PRD "Board", stories 24 and 25.
