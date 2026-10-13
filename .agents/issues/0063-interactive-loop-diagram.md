---
id: 0063
title: Show the loop as an interactive diagram on the Help overview
category: user-story
status: done
assignee: agent
project: 03-help-center
phase: 2
parent: 0060
labels: [ui, help]
created: 2026-10-05
---

## User story

As a **newcomer**, I want an overview page that shows the loop as a diagram
I can click — each step telling me what I say to my agent and which skill
runs — so that I understand the whole workflow in one glance.

## Acceptance criteria

- [x] The overview shows the loop (Decide → Plan → Slice → Build → Verify → Steer) as a native SVG in theme tokens
- [x] Each step is a focusable button; selecting one (click, Enter, arrow keys) shows what you say, which skill answers and what it writes
- [x] An accent arc shows how far round the loop the selected step is; the intro animation is off under reduced motion
- [x] The overview links to every Help page with a one-line description each, and credits Matt Pocock's skills
- [x] Step content comes from one typed content module shared with the course
- [x] e2e: selecting a step shows its details; visual baseline refreshed for both themes

## Notes

- PRD stories 5–6.
- Built an accent arc that moves to the selected step (plus a short intro animation) instead of a marker that orbits forever: perpetual motion would need a pause control (WCAG 2.2.2).
