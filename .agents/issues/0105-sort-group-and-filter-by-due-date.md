---
id: 0105
title: Sort, group and filter the list by due date
category: user-story
status: backlog
assignee: agent
project: 04-harness-tree
phase: 2
parent: 0085
labels: [ui, list]
created: 2026-10-13
---

## User story

As a **maintainer**, I want **to sort, group and filter the list view by due
date and save that as a view**, so that **"what's due in the next two weeks"
is one click**.

## Acceptance criteria

- [ ] The list view can be sorted by due date — soonest first, issues without a date last. The list has no sort option today (every group is newest first), so this adds one; it lives in the URL like the filters
- [ ] "Due date" joins the ways to group: Overdue, Next 14 days, Later, No date
- [ ] The list filters by Overdue, Next 14 days and No date; sort, grouping and filter round-trip through the URL, so they can be saved as a view
- [ ] In the "Needs you" feed, issues with a due date come first, soonest on top; board columns keep their manual order
- [ ] Unit tests cover the sort, the groups and the query round-trip; an e2e test finds an overdue issue under the Overdue filter and saves that as a view; spec § 13 and § 2 gain the scenarios

## Out of scope

- Reading, showing and editing the field — #0085
- The cross-harness list of what's due — #0086
- Sorting by other fields — add them when someone asks; the option is built so it can grow

## Notes

- PRD story 23. Split from #0085 in the review round: reading and showing a
  date is one slice, a sort option for the list is another.
- Uses the 14-day constant from #0085 — no second window.
- A view saved with a due filter keeps working when no issue has a date: it
  is empty, not broken.
