---
id: 0014
title: Explain the workflow on an in-app Help page
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 3
parent: 0013
labels: [ui, docs]
created: 2026-10-04
---

## User story

As a **new user**, I want **a Help page inside loopboard that explains the loop, folder map, statuses and assignee, and shortcuts, with a one-click copy of the setup prompt**, so that **I learn the workflow where I use it**.

## Acceptance criteria

- [x] `/help` renders the docs-folder markdown bundled at build time (one source with the README)
- [x] Reachable from a rail link and the `?` shortcut
- [x] "Copy setup prompt" copies the exact prompt from the README and confirms
- [x] The keyboard shortcut list matches the shortcuts the app registers (single source, not a hand-kept list)
- [x] Playwright: open Help with `?`, copy the prompt

## Out of scope

- Search inside Help — the content is short

## Notes

- PRD stories 18, 19.

## Outcome

- `/help` renders `docs/*.md` (also linked from the README); `?` and a rail footer link open it; the shortcut table comes from `src/shortcuts.ts`, which the handlers use too.
- Fixed the § 6 known gap on the way: "/" in the Specs view now focuses the scenario search.
