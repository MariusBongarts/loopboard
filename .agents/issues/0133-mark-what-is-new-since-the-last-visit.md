---
id: 0133
title: Mark what is new on Home since the last visit
category: user-story
status: done
assignee: agent
project: 06-home-timeline
phase: 3
parent: 0127
labels: [ui, home]
created: 2026-10-29
---

## User story

As a **maintainer**, I want **dots on what is new since I last looked, and a Mark all seen action**, so that **I see at a glance what changed**.

## Acceptance criteria

- [x] Runs after the last-seen time, and sessions and issues of a later day, carry a dot
- [x] Mark all seen stores now as last seen for this workspace in this browser; with none, the last 24 hours count as new
- [x] The rail's Home entry shows the number of new items
- [x] Vitest for what counts as new

## Out of scope

- Last seen across devices (the server stays read-only)

## Notes

- PRD story 11.
