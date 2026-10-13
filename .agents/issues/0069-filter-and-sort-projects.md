---
id: 0069
title: Filter and sort the Projects view
category: user-story
status: done
assignee: agent
labels: [ui]
created: 2026-10-06
---

## User story

As a **maintainer** with dozens of projects, I want to filter the Projects
view by text and sort it by last activity, progress and more, so that I can
find a project without scrolling the whole list.

## Acceptance criteria

- [x] A "Filter projects" box narrows the list to projects whose number,
  title, slug or current focus match every word; the header count follows
  the filter, and a filter that matches nothing says so
- [x] The filter lives in the URL (`?q=`), so Back from a project's board
  restores it
- [x] A sort menu orders projects inside each group by Last active
  (default), Newest, Progress, Needs you or Name; the choice is remembered
  per browser
- [x] Spec 03 and an e2e test cover it

## Out of scope

- Filtering by status (the Active / Paused / Shipped groups already do that)
- Saved views for projects

## Notes

- Reuses the feed's project search and the list view's toolbar, whose
  styles move to shared primitives.
