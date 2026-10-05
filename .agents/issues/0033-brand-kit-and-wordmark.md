---
id: 0033
title: Codify the look in a Brand Kit with a loopboard wordmark
category: task
status: in-review
assignee: human
project: 01-open-source-launch
phase: 8
labels: [design]
created: 2026-10-04
---

## What needs to change

Capture the current redesign as `.agents/design/Brand Kit.html`: color tokens
(paper, ink, ember and the status hues), type (Fraunces, Geist, JetBrains
Mono), spacing, and the core components (card, chip, column, rail row, drawer,
strip), each rendered live. Propose three loopboard wordmark/logo options in
the kit; the maintainer picks one during review, and it becomes the favicon
and the rail brand.

## Why

AGENTS.md routes UI work through a Brand Kit that doesn't exist in this repo.
It also doubles as the example for the `design/` folder that `init`
scaffolds.

## Acceptance criteria

- [x] The Brand Kit renders every token and component from the real stylesheet (no copied values that can drift)
- [x] Three wordmark options are shown; the chosen one is applied to the favicon and rail
- [x] AGENTS.md's Brand Kit link resolves

## Out of scope

- Dark theme — #0034
- A visual redesign — the PRD keeps the current direction

## Notes

- PRD story 43. The wordmark choice is a design judgment: the agent proposes, the maintainer decides in review.

## Outcome

- `.agents/design/Brand Kit.html`: written UI rules for agents, live swatches (read from the stylesheet, light/dark toggle), type and component samples; three wordmark options. Option A (serif "loop*board*") is applied as the default in the welcome page and Help; the favicon uses option B's loop mark.
- Fonts are now self-hosted (`@fontsource-variable/*`) — no Google Fonts request.

## Review

Pick the wordmark (A, B or C in the Brand Kit's Wordmark section, or none
of them). A is applied as the default; the favicon uses B's mark. Flip to
`done` once decided.
