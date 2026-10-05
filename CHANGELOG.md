# Changelog

All notable changes to loopboard. Workflow changes that existing harnesses
must apply are numbered in [MIGRATIONS.md](MIGRATIONS.md).

## [Unreleased]

### Run anywhere
- `npx loopboard [path]` starts a local board for any repo with an `.agents/`
  (or legacy `ai/`) folder; a second repo joins the running server.
- One server for every repo: a workspace switcher in the top-left, workspaces
  remembered in `~/.config/loopboard`, folder suggestions when adding one.
- Live updates: the board follows file changes as agents work.

### Set up and upgrade
- `loopboard init` scaffolds the workflow (skills, templates, specs,
  architecture, rules, design, AGENTS.md block); `--with-extras`,
  `--upgrade`, `--force`, `--dry-run`.
- The `upgrade-harness` skill and numbered migrations bring running harnesses
  forward without overwriting customized skills.
- In-app Help, a welcome page and empty states with the copyable setup prompt.

### Work with it
- Create issues (`C`) and projects; ⌘K command palette; copy a ready-made
  agent prompt for any issue or project; "Needs you" across all workspaces.
- Edit issues, PRDs, WIPs and specs in place — rich text or source — with
  hash-checked saves, conflict resolution and block splicing so untouched
  lines keep their bytes. Checklists toggle with one click in the drawer, and
  `#NNNN` mentions open the issue (unknown ids stay plain text).
- Relations from `parent:`, a projects overview with per-phase progress
  (backlog ideas don't count), git history per issue, a grouped list view
  with URL filters and saved views.
- `reviewed:` / `deployed:` markers and a review queue; agents close verified
  issues as `done` (migration M002).
- `loopboard next-id`, `check` and `renumber` keep sequential numbers unique
  across branches and worktrees; `check` ignores mentions inside code.

### Look and feel
- Dark theme (system, light or dark), a Brand Kit, self-hosted fonts — no
  request ever leaves the machine.
- Empty columns shrink to strips, the feed can hide, and the board fades the
  edge that hides columns.
