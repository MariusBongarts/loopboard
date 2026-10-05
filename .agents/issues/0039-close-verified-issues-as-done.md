---
id: 0039
title: Close verified issues as done; review and deploy become optional markers
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 1
labels: [workflow, conventions]
created: 2026-10-04
---

## User story

As a **solo developer working with agents**, I want **agents to close verified issues as `done` and park an issue in `in-review` only when it truly needs me**, so that **`in-review` means "waiting on me" and stops being a graveyard**.

## Why now

In webhighlights, 340 of 822 live issues (41%) sit in `in-review`, back to
May; 331 of them are assigned to the agent. Nobody reviews them, so the
column no longer says anything.

## Acceptance criteria

- [x] The issues README redefines `in-review`: implementation done but it can't count as done until a human checks it (manual UI, OAuth, visual or product judgment); always with `assignee: human` and a `## Review` section saying what to check
- [x] The issues README documents optional `reviewed: YYYY-MM-DD` and `deployed: YYYY-MM-DD` frontmatter; agents never set `reviewed`
- [x] AGENTS.md's session loop: verify passes + ACs met → `done`; otherwise `in-review` + `assignee: human`
- [x] implement, triage and to-issues skills follow the new loop
- [x] The glossary (specs § 0) defines In review, Reviewed and Deployed
- [x] The tracker reads issues carrying `reviewed:`/`deployed:` unchanged (Vitest)

## Out of scope

- Showing or setting the markers on the board — #0040
- Rolling the change out to other harnesses — #0041 (migration M002)

## Notes

- PRD stories 48–49. The status vocabulary itself doesn't change.
