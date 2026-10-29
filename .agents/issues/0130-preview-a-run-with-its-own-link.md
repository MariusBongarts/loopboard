---
id: 0130
title: Preview a run with its own link
category: user-story
status: done
assignee: agent
project: 06-home-timeline
phase: 2
parent: 0127
labels: [ui, home, routines]
created: 2026-10-29
---

## User story

As a **maintainer**, I want **a click on a run to open a preview with its status, times, host, issues and whole note, at a URL of its own**, so that **I can read, share and bookmark a run without leaving Home**.

## Acceptance criteria

- [x] A click on a run opens a preview dialog; the URL gets `?peek=run/<slug>/<YYYY-MM-DDTHHMM>`
- [x] The preview shows the summary as title, the status, start–end, duration, host, the issues the run filed and mentioned, and the rest of the note rendered with `#NNNN` links
- [x] Older / Newer step through the routine's runs; a strip shows where this run sits
- [x] Esc, the close button and the browser's Back close it; opening the URL directly shows it after a reload
- [x] Copy link copies the URL; Open in board goes to the routine's page
- [x] Playwright: open by click, open by URL, Esc closes

## Out of scope

- Issue, project and routine previews (#0131)

## Notes

- PRD stories 14, 15, 18, 20.
