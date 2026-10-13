---
id: 0064
title: Render explainer videos from code with Remotion
category: task
status: done
assignee: agent
project: 03-help-center
phase: 2
labels: [videos, build]
created: 2026-10-05
---

## What needs to change

A standalone `videos/` package (outside the pnpm workspace and the published
files) holds Remotion compositions in the app's tokens and fonts, and one
command renders every composition in light and dark to MP4 plus a poster each,
into the app's public media folder. The CLI's static server serves those files
with the right types and `Range` support.

## Why

The course (#0066) needs motion graphics that match the app and can be
changed without re-recording. Keeping Remotion a maintainer tool keeps
loopboard's install and bundle light and keeps Remotion's license off
loopboard's users.

## Acceptance criteria

- [x] `pnpm videos` installs the video package on demand and renders all compositions × 2 themes + posters; `pnpm videos:studio` opens Remotion Studio
- [x] Video tokens (colors, fonts) match `styles.css`; a unit test checks the values
- [x] The static server serves `.mp4`, `.jpg`, `.webp` with correct types and answers `Range` with 206; unit-tested
- [x] ADR records "Remotion renders, MP4s ship"; release architecture doc explains the pipeline
- [x] Remotion, React and the video sources are absent from `npm pack`

## Notes

- PRD stories 23, 24, 26.
- Pinned Remotion 4.0.532: 4.0.533 was published the same day and pnpm's minimum-release-age policy rejects it.
- The SSR build copied `public/` into `build/server/` too, shipping every video twice (9.3 MB package); `copyPublicDir` is now client-only (5.0 MB).
