---
id: 0085
title: Give issues a due date and see what's overdue
category: user-story
status: backlog
assignee: agent
project: 04-harness-tree
phase: 2
labels: [ui, data, conventions]
created: 2026-10-13
---

## User story

As a **maintainer whose work has deadlines — a reply that is owed, a
renewal, an event with a date**, I want **an issue to carry a due date that
the board shows**, so that **work with a deadline doesn't look like every
other todo and I notice it before the date passes**.

## Acceptance criteria

- [ ] An optional `due: YYYY-MM-DD` is read from the frontmatter (normalised like `created`) and returned by the API; today the field survives in the file but the reader drops it
- [ ] A value that isn't a date never breaks anything: the issue loads without a due date, `loopboard check` prints the file with "due is not a date", and the issue view shows the raw value marked as invalid
- [ ] The issue view has a date field in its properties; setting and clearing it writes only the `due:` line
- [ ] Cards, list rows and the issue view show the date; an open issue past its date reads "overdue", one due within the next 14 days "due soon", and a closed issue shows the plain date. The 14 days are one constant in `shared/` that every due view uses
- [ ] The issue templates, the issues README (where the field loses its "reserved" marker), `docs/statuses.md` and the glossary's "Issue" entry document the field. No migration entry: an existing harness has nothing to do
- [ ] Vitest covers reading, patching and the overdue boundary (due today is not overdue); an e2e test sets a date in the past and sees "overdue" on the card; spec § 3, § 4 and § 5 gain the scenarios

## Out of scope

- Sorting, grouping and filtering by due date, and the order of the "Needs you" feed — #0105
- The cross-harness view of what's due — #0086
- A time of day, reminders or notifications — a due date is a day, and nothing pings
- A calendar view
- Reordering board columns by due date — `priority` stays the column order
- Recurring issues — #0090

## Notes

- PRD stories 21, 22. "Today" is the local date of the browser for display
  and of the machine for the CLI; an issue due today is due, not overdue.
- One window everywhere: "due soon" on a card and the cross-harness list in
  #0086 both mean the next 14 days.
- YAML hands an unquoted date over as a `Date` object — the same trap
  `created` already handles.
- Overdue is a property of open issues only: `done` and `wontfix` never read
  overdue, whatever the date says.
