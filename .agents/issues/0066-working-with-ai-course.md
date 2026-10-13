---
id: 0066
title: Teach working with AI agents in a course page
category: user-story
status: in-review
assignee: human
project: 03-help-center
phase: 2
parent: 0065
labels: [ui, help, content]
created: 2026-10-05
---

## User story

As a **newcomer**, I want a course page that explains, chapter by chapter,
why agents need a harness, skills, grilling, PRDs, vertical-slice issues, the
issue loop, feedback loops and steering from the board — each with a short
video and what to say to my agent — so that I learn how to work with agents,
not just how to use loopboard.

## Acceptance criteria

- [x] `/help/learn` has a chapter list and one section per chapter, each with prose, "you say" / skill, and a video (where one exists)
- [x] The player follows the theme, shows the poster, autoplays muted and looped only while on screen, has controls, and never autoplays under reduced motion
- [x] Matt Pocock is credited at the top and in the skills chapter, with links to his skills repo and writing
- [x] e2e: chapters render with a video per video chapter; reduced motion keeps videos paused; spec § 9 updated

## Notes

- PRD stories 14–20.

## Review

Two things the agent couldn't check:

- **Safari.** Open the course with `pnpm build && pnpm start` (the CLI
  server, which now answers `Range` requests) and in `pnpm dev`; the videos
  should play when scrolled into view. Playwright's WebKit wasn't installed
  for this version, so only Chromium is tested.
- **The copy.** Read the eight chapters in `docs/learn/` (also readable on
  GitHub). They're your public explanation of the workflow and credit Matt
  Pocock; adjust tone or claims as you like.
