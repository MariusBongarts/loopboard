---
id: 0074
title: Declutter the rail and lists, and count "Needs you" one way
category: task
status: todo
assignee: agent
labels: [ui, structure]
created: 2026-10-13
---

## What needs to change

The board reads clearly with a handful of issues and loses that at real size
(~950 live issues, 40+ unshipped projects). Tidy the parts that grow without
bound, and make "Needs you" mean one thing:

- **Needs you** is computed twice with different rules: the rail excludes
  `backlog` and ignores `blocked`, the cross-workspace `/needs-you` view
  includes human-assigned `backlog` issues and every `blocked` issue. The
  same workspace shows 102 in one place and 110 in the other.
- **"Issues" and "All issues"** sit in the rail with the same count but lead
  to different places (a feed filter and the list view).
- **"Inbox"** is an activity feed whose count is the total number of feed
  entries; it never goes down.
- **The list view** opens with every status, so hundreds of done issues are
  expanded by default.
- **The Done column** has no limit and includes archived issues.
- **The rail** lists every unshipped project and its sections can't be
  collapsed.

## Why

"What's waiting on me?" is the board's main promise; two numbers for it
undermine that. The rest is noise that hides the active work on any
workspace older than a few weeks.

## Acceptance criteria

- [ ] One `needsYou` definition lives in `shared/` and is used by the rail,
  the board and `/needs-you`; a test pins the rule
- [ ] "Issues" (feed filter) and "All issues" (list) are merged or renamed
  so their difference is obvious
- [ ] The Inbox count shows what's new since the last visit, or the entry is
  renamed "Activity" and carries no count
- [ ] The list view opens on open issues; "All" is one click and lives in
  the URL
- [ ] The Done column shows the 30 most recent with "Show all"; archived
  issues appear only on request
- [ ] Rail project sections collapse (remembered per browser); beyond 10
  projects the rest sit behind "More…"
- [ ] Cards show at most two labels plus "+n"
- [ ] Spec and visual baselines updated

## Out of scope

- A cross-workspace overview page
- Changing the status vocabulary

## Notes

- Decide the single `needsYou` rule first: recommended is
  `assignee: human`, not archived, status not in `done` / `wontfix` /
  `backlog` — `blocked` stays a status, not an ask.
