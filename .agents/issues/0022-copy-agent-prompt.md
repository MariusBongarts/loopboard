---
id: 0022
title: Copy an agent prompt for any issue or project
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 5
labels: [ui, agents]
created: 2026-10-04
---

## User story

As a **developer**, I want **a "Copy agent prompt" action on every issue and project that produces the right skill invocation**, so that **handing work to Claude Code, Cursor or Codex is one paste**.

## Acceptance criteria

- [x] Issue → `Use the implement skill on #NNNN.`; issue assigned to human with `## Questions` → a prompt to continue after the answers; project without issues → `Run the to-issues skill on project NN-slug.`; project → `Continue project NN-slug: read wip.md Current focus and implement the next todo.`
- [x] Prompt templates live in one module with unit tests
- [x] Available on cards (hover), in the drawer, on the project pane and in ⌘K
- [x] A toast confirms the copy

## Out of scope

- Launching an agent directly — out of scope in the PRD

## Notes

- PRD story 27. No dependency on other slices; can be picked up any time.

## Outcome

- `src/prompts.ts` (unit-tested), drawer button, pane-header button, card hover icon, ⌘K; toasts confirm.
