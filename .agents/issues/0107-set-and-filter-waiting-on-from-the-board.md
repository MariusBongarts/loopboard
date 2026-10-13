---
id: 0107
title: Set and filter waiting-on from the board
category: user-story
status: backlog
assignee: agent
project: 04-harness-tree
phase: 2
parent: 0088
labels: [ui, list]
created: 2026-10-13
---

## User story

As a **maintainer**, I want **to pick who an issue waits on from a list of
names, and to filter the list view by it**, so that **I don't type ids into
frontmatter and "everything waiting on the accountant" is one click**.

## Acceptance criteria

- [ ] The issue view sets and clears `waiting-on` through a picker that lists the tree's people and organisations by name and filters as you type; the write changes only the lines it owns — `waiting-on` and, as question 1 in #0088 is answered, the since date
- [ ] The picker writes the quoted form, handles one value and several, and keeps an id it can't resolve instead of dropping it
- [ ] The list view filters by "Waiting on" — anyone, or one person or organisation; the filter lives in the URL, so it can be saved as a view
- [ ] Tests cover the picker's write (one value, a list, clearing) and the filter's query round-trip; an e2e test sets a person and finds the issue under the filter; spec § 4 and § 13 gain the scenarios

## Out of scope

- Reading and showing the field, `check`, and the questions about "since" and "Needs you" — #0088
- Creating a person from the picker — object files are written by agents and your editor (deferred in `wip.md`)
- Typing `@` in the editor to pick a person — a follow-up

## Notes

- PRD story 29. Split from #0088 in the review round. It waits on #0088,
  and through it on the maintainer's answers there.
- The inline property pickers (#0052) are the prior art for the control and
  for line-level writes.
- In a harness without an objects folder the picker says so in one line
  instead of showing an empty list.
