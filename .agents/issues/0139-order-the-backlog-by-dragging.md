---
id: 0139
title: A Backlog in the rail, grouped by project, ordered by dragging
category: user-story
status: done
assignee: agent
labels: [ui, backlog, navigation]
created: 2026-11-03
---

## User story

As a **maintainer**, I want **every backlog idea in one place, grouped by
project, and to drag them into the order I want**, so that **I know what to
schedule next without opening each project's drawer**.

## Acceptance criteria

- [x] The rail's Workspace section has Backlog, opening `/w/<ws>/backlog` with every live idea grouped by project, no project last.
- [x] Dragging a row (or Alt+↑/↓ on a focused one) sets `priority:` on disk; order survives a reload.
- [x] A row promotes to Todo, opens in the panel and has the issue's right-click menu.
- [x] The columns/reorder route accepts `backlog`, under the same whole-bucket rule.
- [x] A filter narrows the list and lives in `?q=`.
- [x] `C` here presets Status to Backlog.
- [x] Spec § 5, § 11, the issue README and `docs/statuses.md` say so; e2e tests cover it.

## Out of scope

- Dragging an idea into another group to change its project: the Project picker does that.
- A flat list across projects.

## Memory

### 2026-11-03

- `priority` is per bucket across the workspace, so a drag in one group splices
  into the whole backlog order (`spliceSubset`); other groups keep their slots.
  Every drag rewrites each idea's `priority:`, as the board does for a column.
- `BacklogRow` is shared with the drawer, which now sorts by priority too.
