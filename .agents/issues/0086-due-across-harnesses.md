---
id: 0086
title: See what's due across all harnesses
category: user-story
status: backlog
assignee: agent
project: 04-harness-tree
phase: 2
parent: 0085
labels: [ui, workspaces]
created: 2026-10-13
---

## User story

As a **maintainer with deadlines spread over a company, a taxes workspace
and a few code repos**, I want **everything overdue or due in the next 14
days from every harness in one list**, so that **a deadline in a harness I
didn't open today can't hide**.

## Acceptance criteria

- [ ] The cross-workspace page gains a "Due" section next to "Needs you": every open issue with a due date that is overdue or due within the next 14 days, from every registered harness, soonest first
- [ ] Each row shows the harness, the id, the title, the date with the overdue or due-soon styling from #0085, and who drives it; agent-assigned issues are included — a deadline is a deadline
- [ ] The section reads the harness index from #0084, extended by `due` and the assignee — no issue bodies, no second route; harnesses whose folder is missing are listed as skipped
- [ ] Clicking a row opens the issue in its workspace, selected, like a "Needs you" row does
- [ ] The switcher entry reads "All workspaces · Needs you and due", and the page's heading and title read "Needs you and due"
- [ ] A test for the index fields; e2e with two fixture workspaces, one with an overdue issue and one with a due-soon issue; spec § 7's "See what needs me across all workspaces" is updated

## Out of scope

- What's due per harness on an overview of the tree — not loopboard's (ADR-0009)
- Live-watching every harness — the page refetches on open and on window focus, as today
- Changing the window from 14 days — a fixed number until someone needs another

## Notes

- PRD story 24. Today the page reads every issue of every workspace in full
  for "Needs you"; the due section must not copy that, which is why it reads
  the index.
- Also needs #0084 (the harness index) and #0074, which decides the single
  "Needs you" rule; use it here, don't add a third definition.
- The window is the constant from #0085: an issue listed here always carries
  the overdue or due-soon styling on its card as well.
