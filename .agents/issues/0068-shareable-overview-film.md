---
id: 0068
title: Render a shareable overview film of how I work with AI
category: task
status: in-review
assignee: human
project: 03-help-center
phase: 3
parent: 0065
labels: [videos, content]
created: 2026-10-05
---

## What needs to change

A composition that plays the course scenes in sequence with an intro and
outro (credit to Matt Pocock, loopboard link), in 1920×1080 and 1080×1080,
rendered on demand to `videos/out/` (not shipped).

## Why

The maintainer wants to post about their AI setup; the film reuses the
course scenes instead of a separate edit.

## Acceptance criteria

- [x] `pnpm videos:film` renders landscape and square MP4s to `videos/out/`
- [x] Intro names the workflow; outro credits Matt Pocock and links loopboard
- [x] `videos/out/` is git-ignored

## Notes

- PRD story 25.

## Review

Watch `videos/out/loopboard-landscape.mp4` (1920×1080) and
`videos/out/loopboard-square.mp4` (1080×1080), about two minutes each, before
posting. On a phone the scenes' small UI text gets tiny — if that matters for
the platform, post single chapters (`public/media/learn-*-dark.mp4`) instead,
or ask for a larger-type cut. The outro credits Matt Pocock and links
mattpocock/skills.
