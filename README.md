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

- **`Board` / `Specs` mode toggle** in the masthead. Board mode is the
  daily issue triage surface; Specs mode renders every
  `ai/specs/NN-*.md` user-facing spec with per-scenario E2E coverage,
  a weighted aggregate %, cross-spec search, and four status filter
  chips (`✅ 🟡 ⏳ ❌`). The active mode is persisted to
  `localStorage`. Specs mode is read-only — coverage table edits stay
  in your code editor.
- **5-column Kanban board** — `todo`, `blocked`, `in-progress`,
  `in-review`, `done`. `blocked` is always visible (even when empty).
  The archive toggle adds a 6th column for `wontfix` when occupied.
- **Two filter rows.** Top row: assignee filter — `All` / `Agent` /
  `Human` — answers *"what's on the agent's plate vs mine?"*. Second
  row: project filter — `All`, one per active project, `Standalone` —
  with each project chip showing its `wip.md` status
  (`active` / `shipped` / `paused`) and a count.
- **Archive toggle** in the header reveals `ai/issues/_archive/*.md`,
  any `shipped` projects, and the `wontfix` column.
- **Drag-and-drop re-status** — dropping a card on a column rewrites
  the issue file's `status:` frontmatter immediately. Dropping on
  `wontfix` opens a "Why rejected" modal that requires a non-empty
  reason; the server appends a `## Why rejected` section to the body
  before flipping status. Matches the `triage` skill's contract from
  `ai/issues/README.md`.
- **Click the assignee chip on a card** to toggle between `agent` and
  `human` (with a stop-propagation so the drawer doesn't open). Used
  when the agent flips `assignee: human` because it needs your input,
  and when you flip it back after answering.
- **`done` does NOT auto-archive.** The project ship-gate in `AGENTS.md`
  is the canonical archive trigger. The tracker only flips status.
- **Click a card** → right-side drawer with the rendered markdown body.
- **Refresh** button in the header re-pulls files from disk after you
  edit an issue in your code editor.

## Architecture

A Vite + Vue 3 app with a Vite middleware that exposes three endpoints:

- `GET /api/data` → `{ issues, projects, specs }`. Reads
  `ai/issues/*.md` (active), `ai/issues/_archive/*.md` (archived),
  `ai/projects/*/wip.md` + `ai/projects/*/prd.md` (project metadata +
  doc bodies), and `ai/specs/NN-*.md` (user-facing specs with parsed
  scenarios + coverage tables) from the repo root.
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
(`mutate.test.ts`, `colors.test.ts`, `specs.test.ts`).

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
