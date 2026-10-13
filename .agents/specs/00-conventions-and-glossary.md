# 0. Conventions & Glossary

- **Root** — the folder loopboard reads, `.agents/` in this repo and by
  default. `BASE_PATH` points the dev server at another root (relative to
  this repo or absolute). Legacy repos use `ai/`.
- **Issue** — one markdown file at `<root>/issues/NNNN-slug.md` with YAML
  frontmatter (`id`, `title`, `category`, `status`, `assignee`, optional
  `project`, `phase`, `parent`, `labels`, `source`, `created`, `priority`).
  The filename's four digits are the canonical ID. Format:
  [`../issues/README.md`](../issues/README.md).
- **Archived issue** — an issue moved to `<root>/issues/_archive/`. It has
  left the workflow: shown in its project's Done column, never in the feed or
  backlog, never draggable.
- **Standalone issue** — an issue without `project:`. Standalone issues share
  one board, "Standalone issues".
- **Project** — a folder `<root>/projects/NN-slug/` holding a **PRD**
  (`prd.md`, the contract) and a **WIP** (`wip.md`, the journal). Its status
  (`active`, `paused`, `shipped`) comes from the WIP header. Format:
  [`../projects/README.md`](../projects/README.md).
- **PRD number** — the leading digits of a project slug, shown in small grey
  type next to every project name.
- **Slug** — the readable, lowercase ASCII form of a title or folder name
  that loopboard puts into issue file names, project folders and workspace
  ids: `ä`, `ö`, `ü` and `ß` are written out (`ae`, `oe`, `ue`, `ss`), other
  accented Latin letters keep their base letter (`é` → `e`, `ñ` → `n`), and
  every other run of characters becomes one dash. Issue and project slugs
  are cut at 60 characters. A name that leaves nothing (only symbols, or a
  script without a Latin form) becomes `untitled` for an issue or a project
  and `workspace` for a workspace id.
- **Current focus** — the first paragraph of a WIP's `## Current focus`
  section; what the project is doing right now.
- **Session** — one dated `### YYYY-MM-DD` entry in a WIP's `## Activity log`.
  Only the first entry per date counts; its first paragraph or bullet is the
  session note.
- **Status** — an issue's lifecycle state: `backlog`, `todo`, `blocked`,
  `in-progress`, `in-review`, `done`, `wontfix`. The vocabulary is fixed.
- **In review** — `status: in-review`: built, but waiting on a human check
  the agent can't do itself. Always assigned to human, with a `## Review`
  section. Verified work goes straight to `done`.
- **Reviewed / Deployed** — optional `reviewed:` and `deployed:` frontmatter
  dates recorded after `done`. Markers, not statuses; agents never set
  `reviewed:`.
- **Grooming** — a sweep of every live issue with the issue-grooming skill:
  it checks each against commits, merged PRs and releases, closes what
  shipped, archives what's finished and asks the maintainer about stale,
  duplicate or outdated issues.
- **Assignee** — who drives an issue now: `agent` (default) or `human`.
  Orthogonal to status.
- **Needs you** — every live (not archived), open (not `done`/`wontfix`)
  issue with `assignee: human`.
- **Priority** — an optional integer sort rank within a board column
  (1 = top), written when a card is dragged into position. Not severity.
- **Backlog** — issues with `status: backlog`: captured ideas that are not
  scheduled. They live in the Backlog drawer, never on the board.
- **Rail** — the left column: brand, search, views and the project list.
- **Feed** — the middle column: sessions and issues grouped by day.
- **Project pane** — the right column: the selected item's project board,
  with PRD, WIP and Activity tabs.
- **Pin** — a project marked to stay at the top of the rail, remembered per
  browser.
- **Spec** — a numbered file `<root>/specs/NN-slug.md` describing user-facing
  behavior as `### Scenario:` blocks; distinct from a PRD, which says *why*
  work is done.
- **Scenario** — one GIVEN/WHEN/THEN block under a `### Scenario:` heading.
- **E2E coverage** — the per-scenario Playwright status recorded in a spec's
  `## E2E coverage` table: ✅ covered, 🟡 partial, ⏳ fixme, ❌ not yet.
- **Harness** — what makes an agent follow the workflow in a repo: the
  managed block in `AGENTS.md`, the skills in `.agents/skills/` and the
  conventions in the root's READMEs and templates.
- **Skill** — a folder with a `SKILL.md` (name, one-line description,
  instructions) that an agent loads when a request matches its description.
- **Migration** — a numbered workflow change (`MNNN`) in `MIGRATIONS.md` that
  existing harnesses apply with the upgrade-harness skill.
- **Harness level** — the last migration a harness applied: the
  `<!-- loopboard:migration MNNN -->` marker in its `AGENTS.md`; no marker
  means M000.
- **Help Center** — `/help` and its pages: Overview, Working with AI agents
  (the **course**), Set up a repo, Upgrade a harness, Reference.
