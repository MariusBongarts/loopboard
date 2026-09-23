---
id: 0069
title: Give the tracker a home when the board no longer fits
category: user-story
status: in-review
assignee: agent
labels: [ui]
created: 2026-09-23
---

## User story

As a **maintainer with hundreds of issues across dozens of projects**, I want **a home that shows what needs me, which projects and PRDs were worked on last, and a board that is not a wall of filters**, so that **I can find the work in progress without scanning every chip and column**.

## Why this is hard today

The board is the only daily surface. On a large repo the two filter rows wrap for most of the viewport (about 630 issues on the board, ~30 project chips, 292 in review, 248 done), and the columns that matter — in progress, blocked, and anything assigned to a human — disappear into the scroll. A project doc opens only after that project's chip is selected. Nothing reads a project's current focus or the date of its last session, so the last PRD worked on is a memory test.

## Acceptance criteria

The direction is not locked. Five clickable prototypes are the decision surface: open `/dashboard-prototypes.html` on the running tracker and switch between them. After a direction is chosen, split the build into vertical slices. This issue is done when:

- [x] A direction is chosen (one prototype, or a named mix of pieces). — Inbox "Context" (round 4, variant 2).
- [ ] Follow-up issues are filed for that direction, each a vertical slice an agent can finish in one session. — Not filed: the maintainer asked for Context to be built directly, and it shipped as this one slice. Follow-ups below are candidates, not filed yet.
- [x] The chosen home shows, without picking a project chip first: work assigned to the human that is not done, projects ordered by last session, and each project's current focus. — "Needs you" view/count and rail order are always visible; current focus shows on the board of whichever item is selected (one project at a time, not all at once).
- [x] The default board no longer lists every project as a wrapping chip row. — Board mode and its chip rows are removed; the Inbox is the only screen.
- [ ] In-review and done do not occupy the default view as hundreds of equal cards. — The default view is one project's board, not all projects, but that board still lists every done card for the project (e.g. 109 on Multi-Language). Folding or capping Done is a follow-up.

## Out of scope

- Building all five prototypes into the product.
- New statuses, or editing PRD / WIP / issue bodies inside the tracker.
- A new "updated" frontmatter field. Last session can be the newest `### YYYY-MM-DD` heading in that project's activity log.
- Search, drag-and-drop, specs mode, and the backlog drawer stay. This changes what you see first, not those tools.

## Questions

1. Which prototype, or which pieces should be combined? — **Context** from `/inbox-prototypes.html`. (Threads was built first, then the maintainer switched to Context; the thread grouping was removed.)
2. Should the app land on Home every visit, or reopen the last project? — The app lands on **Inbox** (the new default mode, still persisted per browser) and reselects the **last selected item**, falling back to the newest item.
3. Once a single project is open, is a kanban still right, or is a status-grouped list enough? — **Kanban kept**: the right pane reuses Board mode's drag-and-drop columns, with PRD / WIP / Activity as tabs.
4. Should shipped and paused projects stay out of the default lists until search? — **Shipped are hidden** from the rail; **paused** get their own rail section. Their sessions and live issues still appear in the feed by date.

## Implementation (2026-09-23)

- Server: `server/wip.ts` parses a per-project digest (first paragraph of `## Current focus`, PRD problem + solution, dated activity-log sessions, last session) into `/api/data`. Issue `created` is normalized to `YYYY-MM-DD`.
- Client: `InboxView.vue` (rail · day-grouped feed · board pane), `ProjectPane.vue` (board with highlight + pinned slot, PRD / WIP / Activity), `IssueRefText.vue` (clickable `#NNNN`), pure helpers in `src/inbox.ts`. PRD/WIP rendering extracted to `src/projectDoc.ts` and shared with `ProjectDrawer.vue`; `byPriority` shared with Board mode.
- Tooling: `vitest` + `@types/node` added; `pnpm test`, `pnpm lint:fix` (type check), `pnpm verify`. Unit tests in `tests/wip.test.ts` and `tests/inbox.test.ts`.
- Candidate follow-ups: fold or cap the Done column in the project board; ⌘K search across projects / issues / PRDs.
- 2026-09-23 (later): masthead and the old Board / Specs modes removed. Specs moved into the rail under Issues; Refresh moved into the rail; the project backlog drawer opens from the board's Backlog button. "Current focus" and the pinned selection are collapsible strips, collapsed state remembered. Board-only features dropped with the old view: the all-projects board, the archive toggle and the `/` search. The `public/*-prototypes.html` click dummies are deleted, so the links below no longer resolve.

## Notes

- Click dummy: `public/dashboard-prototypes.html`, served at `/dashboard-prototypes.html` on both running trackers. Sampled from the live board on 2026-09-23. It does not write to disk.
- Prototypes, in switcher order: Desk, Rail, Queues, Directory, Now.
- 2026-09-23: Rail is the direction to iterate. Second dummy at `/rail-prototypes.html`. Current focus is the first paragraph under `## Current focus` — the section exists on every WIP, and half of them run past 800 characters, so the whole section is not what the screen should show. No new frontmatter field.
- 2026-09-23: Round 2 was rejected as too sparse. Round 3 is five full dashboards at `/tracker-designs.html`: Edition, Workspace, Pinboard, Timeline, Inbox. Each has ⌘K search across projects, issues and PRDs, an issue → PRD deep link, and a date-grouped feed with endless scroll. The heatmap and timeline use real activity-log dates.
- 2026-09-23: Newspaper style dropped; Inbox is the direction. Round 4 at `/inbox-prototypes.html` has five Inbox variants (Classic, Context, Takeover, Threads, Peek), built on a live snapshot of the webhighlights `ai/` folder. Clicking a PRD always opens that project's board with its issues, with PRD and Activity as tabs.
- 2026-09-23: Maintainer picked Threads, then switched to **Context** before review. Context is implemented in the real app (see Implementation). Status in-review: maintainer verifies at `pnpm dev:wh` → Inbox.
