---
id: 0106
title: Browse people and organisations in loopboard
category: user-story
status: backlog
assignee: agent
project: 04-harness-tree
phase: 2
parent: 0087
labels: [ui, navigation]
created: 2026-10-13
---

## User story

As a **maintainer about to write to someone**, I want **loopboard to list the
people and organisations of my tree and show each one's notes on a page**,
so that **I read what is known about them without hunting for the file**.

## Acceptance criteria

- [ ] The board lists the tree's people and organisations by name, reachable from every harness of the tree
- [ ] Each has a page with a stable URL showing name, type, organisation (linked) and the file's notes, rendered read-only, with "Copy path" and "Open in editor"
- [ ] An organisation's page lists its people — those whose `org` names it
- [ ] Files the reader skipped (#0087) are listed below the list with file and reason; a tree without an objects folder shows one line saying how to name one in the top node's identity file
- [ ] The list and the pages refetch on open and on window focus
- [ ] The specs gain the scenarios — a new section for people and organisations; an e2e test on the fixture tree opens a person's page from the list

## Out of scope

- Reading the files, `check` and `loopboard resolve @<id>` — #0087
- `@id` mentions as links, and backlinks on the page — #0089
- Creating or editing object files from the board — deferred in `wip.md`
- Searching people from ⌘K — a small follow-up to #0096

## Notes

- PRD story 28. Split from #0087 in the review round: the files and the way
  to them for agents are one slice, the pages are another.
- What the list is called in the UI ("People", "People & organisations") is
  open; "objects" is the name of the mechanism, not of the menu entry. Where
  it sits is a design call — follow the Brand Kit and keep the rail short
  (#0074).
- The objects folder usually sits outside `.agents/`, where the file watcher
  doesn't look — hence refetch instead of live updates.
