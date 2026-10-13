---
id: 0060
title: Turn Help into a Help Center with its own navigation
category: user-story
status: done
assignee: agent
project: 03-help-center
phase: 1
labels: [ui, help]
created: 2026-10-05
---

## User story

As a **maintainer**, I want Help to have its own navigation (Overview,
Working with AI agents, Set up a repo, Upgrade a harness, Reference), so that
I can go straight to what I need instead of scrolling one long page.

## Acceptance criteria

- [x] `/help` is a layout with a sidebar (top nav on narrow screens) and child pages `/help`, `/help/learn`, `/help/setup`, `/help/upgrade`, `/help/reference`
- [x] Every Help link keeps `?from=`; "← Back to the board" returns to that workspace from any Help page
- [x] `?`, the rail's Help link and the ⌘K command still open `/help`
- [x] Set up a repo holds the setup prompt, what `init` creates and the "already set up?" note; Reference holds the loop, folder map, statuses and keyboard shortcuts
- [x] The setup prompt component is generalized into one copyable prompt component (text + button label)
- [x] Help styles move out of `styles.css` into the Help components; light and dark both pass `pnpm contrast`
- [x] Spec § 9 and its e2e tests updated

## Out of scope

- The overview's diagram (#0063), the course (#0066), the upgrade page's content (#0061, #0062)

## Notes

- PRD stories 1–4, 7, 8.
- The app scrolls inside `#app`, not the window, so the Help layout handles hash jumps and scroll-to-top itself; the router's `scrollBehavior` can't reach it.
