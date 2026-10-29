---
id: 0131
title: Preview issues, projects and routines from Home
category: user-story
status: todo
assignee: agent
project: 06-home-timeline
phase: 2
parent: 0130
labels: [ui, home]
created: 2026-10-29
---

## User story

As a **maintainer**, I want **issues, projects and routines on Home to open in previews too, with a Back button when I went from one preview to another**, so that **I can trace a run to its issue and return**.

## Acceptance criteria

- [ ] `?peek=issue/<id>` shows the issue in a preview that also says which run filed it and which runs mentioned it, with Open in board
- [ ] `?peek=project/<slug>` shows the project's focus, open issues and latest sessions; `?peek=routine/<slug>` its schedule, state and recent runs
- [ ] Following a link inside a preview opens the next preview and shows Back; Back returns to the previous one; Close rewinds to where the chain started
- [ ] Playwright: run → issue → Back → Esc

## Out of scope

- Editing from a preview

## Notes

- PRD stories 16, 17, 19.
