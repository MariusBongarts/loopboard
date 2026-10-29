---
id: 0132
title: Hover an issue link on Home to see a card
category: user-story
status: done
assignee: agent
project: 06-home-timeline
phase: 3
parent: 0128
labels: [ui, home]
created: 2026-10-29
---

## User story

As a **maintainer**, I want **hovering an issue link on Home to show its status, title, project and the start of its description**, so that **I can tell issues apart without opening them**.

## Acceptance criteria

- [x] Hovering an issue chip, row or `#NNNN` link for about 350 ms shows a card; leaving hides it
- [x] The card stays inside the window and never on touch
- [x] Playwright: hover shows the card with the title

## Out of scope

- Hover cards outside Home

## Notes

- PRD story 21.
