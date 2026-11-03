---
id: 0138
title: A Board in the rail that shows every issue, narrowed by a project menu
category: user-story
status: done
assignee: agent
labels: [ui, board, navigation]
created: 2026-11-03
---

## User story

As a **maintainer**, I want **one board of every issue in the workspace, from
the rail, with a menu to narrow it to a PRD, to issues without a project or to
the backlog**, so that **I can see all the work without going through the feed
and picking one project at a time**.

## Acceptance criteria

- [x] The rail's Workspace section has Board, opening `/w/<ws>/board` with every live issue in the five columns and a project badge on each card.
- [x] A menu at the top left switches between All issues, No project, Backlog and each project, kept in `?scope=`.
- [x] Backlog shows a Backlog column next to the workflow columns; dropping an idea on one schedules it.
- [x] Drag, filters and the panel work as on a project's board; the board code is shared with the project pane, not copied.
- [x] A new issue defaults to the project shown.
- [x] Spec § 2, § 3, § 11 and `client.md` say so; e2e tests cover it.

## Out of scope

- A Board / List choice here: All issues is the list.
- Saved views of the board.

## Memory

### 2026-11-03

- `IssueBoard.vue` is the board and its filters, cut out of `ProjectPane`; the
  parent decides which issues it holds. The pane keeps it mounted with
  `v-show` so filters survive a tab switch; `:key` resets them on a new scope.
- `board.ts`: scopes (`all`, `none`, `backlog`, a slug) and the menu. All leaves
  archived issues out; a project or No project shows them, as the pane does.
- "Unassigned" reads as "No project": every issue always has an assignee.
