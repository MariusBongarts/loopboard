# Issue Tracker

Internal Kanban board for `ai/issues/*.md` and `ai/projects/*`. Localhost
only — never deploy this. See
[`ai/projects/06-issue-tracker/prd.md`](../../ai/projects/06-issue-tracker/prd.md)
for the locked decisions.

## Run

From the repo root:

```bash
pnpm tracker:install   # once
pnpm tracker           # http://localhost:5180
```

## What it does

The whole app is one screen (#0069) — no masthead, three panes:

- **Rail.** The brand and a **Refresh** button (re-reads the files from
  disk after you edit them in your code editor), the views **Inbox**,
  **Needs you**, **Sessions**, **Issues** and **Specs**, then every
  non-shipped project ordered by its last session (paused projects in
  their own section). A rail project narrows the feed to that project.
- **Feed.** One list of dated `wip.md` activity-log sessions and filed
  issues, **grouped by day** under sticky headers (Today, Yesterday,
  Wed, 16 Sep…), newest first, loading earlier days as you scroll.
  Chips above it filter to All / Needs you / Sessions / Issues. `j` / `k`
  move through it. The last selected item is remembered; otherwise the
  newest item is selected.
- **Project pane.** Always the board of the selected item's project:
  `todo`, `blocked`, `in-progress`, `in-review`, `done`, with an
  Everyone / Mine / Agent switch, a filter box, and a **Backlog N**
  button that opens that project's backlog drawer (promote to `todo`
  from there). Above the board sit two **collapsible strips** — "Current
  focus" (first paragraph of the WIP's `## Current focus`) and the pinned
  selection (a selected issue, which is also outlined on the board, or a
  selected session's note). Their collapsed state is remembered.
  `PRD`, `WIP` and `Activity` are tabs next to the board. Standalone
  issues open the standalone board. Clicking a project name on a feed
  row shows that board until another item is chosen.
- **Specs** (rail) replaces the feed and pane with every
  `ai/specs/NN-*.md` user-facing spec: per-scenario E2E coverage, a
  weighted aggregate %, cross-spec search and four status filter chips
  (`✅ 🟡 ⏳ ❌`). Read-only — coverage table edits stay in your editor.

Board behavior:

- **Drag-and-drop re-status** — dropping a card on a column rewrites
  the issue file's `status:` frontmatter immediately. Dropping on
  `wontfix` opens a "Why rejected" modal that requires a non-empty
  reason; the server appends a `## Why rejected` section to the body
  before flipping status. Matches the `triage` skill's contract from
  `ai/issues/README.md`.
- **Click the assignee chip on a card** to toggle between `agent` and
  `human` (with a stop-propagation so the drawer doesn't open).
- **Click a card**, a `#NNNN` reference, or the pinned title → right-side
  drawer with the rendered markdown body. `Esc` closes drawers.
- **`done` does NOT auto-archive.** The project ship-gate in `AGENTS.md`
  is the canonical archive trigger. The tracker only flips status.

## Architecture

A Vite + Vue 3 app with a Vite middleware that exposes three endpoints:

- `GET /api/data` → `{ issues, projects, specs }`. Reads
  `ai/issues/*.md` (active), `ai/issues/_archive/*.md` (archived),
  `ai/projects/*/wip.md` + `ai/projects/*/prd.md` (project metadata +
  doc bodies), and `ai/specs/NN-*.md` (user-facing specs with parsed
  scenarios + coverage tables) from the repo root. Each project also
  carries a digest for the Inbox: `focus`, `problem`, `solution`,
  `lastSession` and dated `sessions` (see `server/wip.ts`). Issue
  `created` dates are normalized to `YYYY-MM-DD`.
- `PATCH /api/issues/:id?archived=<bool>` → body
  `{ status?, assignee?, priority?, reason? }`. At least one of
  `status` / `assignee` / `priority` must be present. Validates each
  against the canonical vocabularies in `ai/issues/README.md`, parses
  the issue's frontmatter with `gray-matter` to confirm shape, then
  targeted-replaces the relevant lines in the original frontmatter
  block (preserves field order, comments, whitespace). When
  `assignee:` is missing it's inserted right after `status:`. On
  `wontfix`, appends a `## Why rejected` section to the body if one
  isn't already there.
- `PATCH /api/columns/reorder?archived=<bool>` → body
  `{ status, ids }`. Writes `priority: 1..N` across the bucket in
  payload order; rejects with 400 if `ids` doesn't match the disk
  bucket exactly.

Three deep modules handle all the file-system logic:

- `server/issues.ts` — read & parse issues + projects.
- `server/wip.ts` — project digest from `wip.md` / `prd.md` (current
  focus, PRD problem + solution, dated activity-log sessions).
- `server/mutate.ts` — safe YAML status / assignee / priority rewrite
  + wontfix body append.
- `server/specs.ts` — parse `ai/specs/NN-*.md` files into
  `Spec[]` with per-scenario E2E coverage extracted from each
  section's `## E2E coverage` markdown table. Coverage math
  helpers (`specCoverage`, `aggregateCoverage`) apply the weighted
  formula `✅=1, 🟡=0.5, ⏳=0, ❌=0`. Sections without a coverage
  table count every scenario as `❌`.

These are the modules worth unit-testing — see
`tools/tracker/tests/` for the existing fixture-based suites
(`mutate.test.ts`, `colors.test.ts`, `specs.test.ts`, `wip.test.ts`,
`inbox.test.ts`). Run them with `pnpm test`; `pnpm verify` type-checks
first.

## Status vocabulary

The tracker is bound to the canonical status vocabulary defined in
[`ai/issues/README.md`](../../ai/issues/README.md). It does not invent
new statuses or transitions; it only enforces the existing rules
(specifically the `wontfix` "Why rejected" requirement).

## Out of scope

See the PRD's **Out of scope** section. Notable: no auto-archive on
`done`, no auth, no remote hosting, no file watcher (manual refresh
only). PRDs / wip.md / specs are all rendered but **not editable** —
body edits stay in your code editor.
