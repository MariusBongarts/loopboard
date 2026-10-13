# Changelog

All notable changes to loopboard. Workflow changes that existing harnesses
must apply are numbered in [MIGRATIONS.md](MIGRATIONS.md).

## [Unreleased]

### Run anywhere
- `npx loopboard [path]` starts a local board for any repo with an `.agents/`
  (or legacy `ai/`) folder; a second repo joins the running server.
- The CLI runs from any folder — every command takes the repo as a path — and
  refuses a flag it doesn't know instead of reading it as a path. A clone
  linked with `npm link` says to run `pnpm build` when it isn't built.
- One server for every repo: a workspace switcher in the top-left, workspaces
  remembered in `~/.config/loopboard`, folder suggestions when adding one.
- `loopboard workspaces` lists the registered workspaces (`--json` for
  agents); `workspaces forget <id>…` removes entries without a running board
  and never touches a repo's files.
- Live updates: the board follows file changes as agents work. When the file
  watcher fails it says "Not live", refetches and recovers on its own;
  "Refresh" is a click on the live indicator or ⌘K away. Symlinked `issues/`
  and `projects/` folders are polled, and `LOOPBOARD_POLL_MS` polls every
  workspace.

### Set up and upgrade
- `loopboard init` scaffolds the workflow (skills, templates, specs,
  architecture, rules, design, AGENTS.md block); `--with-extras`,
  `--upgrade`, `--force`, `--dry-run`.
- The `upgrade-harness` skill and numbered migrations bring running harnesses
  forward without overwriting customized skills.
- The `issue-grooming` skill reconciles the board with git and releases:
  it closes issues that shipped while stuck in review, unblocks and archives,
  and asks with a recommendation about stale, duplicate or outdated ones.
- In-app Help, a welcome page and empty states with the copyable setup prompt.
- A Help Center: an interactive loop diagram; "Working with AI agents", an
  eight-chapter course with short explainer videos (light and dark, made
  with Remotion) that credits and links Matt Pocock's skills, videos and
  writing; the upgrade guide with copyable prompts and every repo's harness
  level against the latest migration.

### Work with it
- Create issues (`C`) and projects; ⌘K command palette; copy a ready-made
  agent prompt for any issue or project; "Needs you" across all workspaces.
- Edit issues, PRDs, WIPs and specs in place — rich text or source — with
  hash-checked saves, conflict resolution and block splicing so untouched
  lines keep their bytes. Checklists toggle with one click in the drawer, and
  `#NNNN` mentions open the issue (unknown ids stay plain text).
- Relations from `parent:`, a projects overview with per-phase progress
  (backlog ideas don't count) that filters by text and sorts by last active,
  newest, progress, needs you or name, git history per issue, a grouped list
  view with URL filters and saved views.
- `reviewed:` / `deployed:` markers and a review queue; agents close verified
  issues as `done` (migration M002).
- `loopboard next-id`, `check` and `renumber` keep sequential numbers unique
  across branches and worktrees; `check` ignores mentions inside code.
- Files the board can't show — invalid frontmatter, a name that isn't
  `NNNN-slug.md`, a file that can't be read, a project folder not named
  `NN-slug` — are counted in the rail and listed with the reason and a prompt
  for your agent; `loopboard check` prints the same list.
- Slugs for issue files, project folders and workspace ids write umlauts out
  (`ä` → `ae`, `ß` → `ss`) and keep the base letter of other accented ones.

### Look and feel
- A calm, Linear-like look: neutral grays, one violet accent, Inter, status
  icons, avatars, label pills and project badges; light, dark or system; a
  Brand Kit; self-hosted fonts and icons — no request ever leaves the machine.
- Issues open in a resizable side panel (‹ › and j/k through the board, list
  or feed they came from) or as a full page at `/w/<ws>/issues/<NNNN>`.
- Change status, assignee, project, labels and parent in place with small
  pickers, or right-click any card or row for the same and more.
- The rail holds every feed view and destination, collapses to icons (`[`),
  and the rail, feed and issue panel resize by drag or keyboard.
- Settings: theme and an editor — "Open in VS Code / Cursor" on every issue.
- Empty columns shrink to strips, the feed can hide, and the board fades the
  edge that hides columns. Quick-created issues get the template's headings,
  not its guidance prose.
