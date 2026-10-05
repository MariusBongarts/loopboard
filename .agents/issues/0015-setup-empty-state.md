---
id: 0015
title: Guide new workspaces with a setup empty state
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 3
parent: 0014
labels: [ui, setup]
created: 2026-10-04
---

## User story

As a **user who opened a repo without the workflow (or loopboard with no workspaces at all)**, I want **a setup screen with the prompt and the init command instead of an empty board**, so that **I know exactly what to do next**.

## Acceptance criteria

- [x] A workspace without a detectable root shows the empty state: what's missing, the copyable setup prompt, and `npx loopboard init`
- [x] With no workspaces registered, the app shows a welcome state with "+ Add workspace" and the same prompt
- [x] When the root appears on disk (live updates), the workspace switches to the board without a reload
- [x] Playwright covers both states

## Out of scope

- Running `init` from the browser — setup stays an agent/terminal action

## Notes

- PRD story 20.

## Outcome

- Welcome page (no workspaces), missing-root page with Forget + polling recovery, and a first-steps feed for an empty workspace; all share `SetupPrompt.vue`.
