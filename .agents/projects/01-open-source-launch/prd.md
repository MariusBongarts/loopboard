# loopboard 1.0 — Open-source launch — PRD

> Drafted: 2026-10-04
> Status: in-progress

## Problem statement

The tracker and its workflow (PRDs, vertical-slice issues, a session loop that
coding agents run) work well, but only for the maintainer. It runs from a clone
of this repo with one hard-coded `BASE_PATH` script per project. The README and
AGENTS.md still describe the private monorepo it was extracted from. No other
developer can set the workflow up in their own repo. Inside the app the human
can steer (drag a status, flip the assignee), but cannot capture an issue, edit
a PRD, or see what an agent just changed without pressing Refresh.

## Solution

A solo developer working with coding agents runs `npx loopboard` in any repo,
pastes a five-line prompt into their agent to set up the workflow, and gets a
local, Linear-like board over the markdown files in `.agents/`. One running
loopboard knows all their repos and switches between them from the top-left
corner. The board updates live while agents work. The human can create, edit
and hand off issues without leaving it, and a Help page explains the loop.

This repository is the reference: its own `.agents/` folder holds the PRD,
issues, specs and architecture docs that built loopboard.

## User stories

**Running loopboard**

1. As a **solo developer**, I want **to run `npx loopboard` in a repo and get the board in my browser**, so that **I don't have to clone the tracker**.
2. As a **developer**, I want **loopboard to find `.agents/` (or a legacy `ai/`) in the repo root on its own**, so that **I never have to pick a hidden folder in a file dialog**.
3. As a **developer**, I want **`loopboard <path>` to open any repo**, so that **I can start it from anywhere**.
4. As a **developer**, I want **the server to listen only on my machine and refuse requests from other sites**, so that **a web page I visit cannot rewrite my repo**.

**Workspaces**

5. As a **developer with several repos**, I want **one running loopboard to remember all of them**, so that **I don't juggle ports and terminal tabs**.
6. As a **developer**, I want **to switch workspace from the top-left corner**, so that **changing context takes one click**.
7. As a **developer**, I want **`npx loopboard` in a new repo to add it to my list and select it**, so that **I never register repos by hand**.
8. As a **developer**, I want **to add a workspace by pasting a path, with folder suggestions as I type**, so that **I can add repos without the terminal**.
9. As a **developer**, I want **to rename and remove workspaces**, so that **the list stays tidy**.
10. As a **developer**, I want **the URL to name the workspace**, so that **bookmarks and tabs keep pointing at the right repo**.

**Live updates**

11. As a **developer watching an agent work**, I want **cards to move and new issues to appear as files change**, so that **I never press Refresh**.

**Setup**

12. As a **developer adopting the workflow**, I want **to paste one short prompt into Claude Code, Cursor or Codex**, so that **my agent sets the workflow up and adapts it to my repo**.
13. As a **developer**, I want **`loopboard init` to scaffold `.agents/` (issues, projects, specs, architecture, rules, design) with READMEs, templates, the core skills and the agent-tool skill links, without overwriting anything**, so that **setup is predictable and safe to re-run**.
14. As a **developer**, I want **the optional extra skills behind a flag**, so that **my repo only gets what the loop needs**.
15. As a **developer**, I want **`loopboard init --upgrade` to refresh skills and templates without touching my issues, projects or specs**, so that **I get improvements without losing work**.
16. As a **developer who customized a skill**, I want **upgrade to warn instead of overwrite**, so that **my edits survive**.
17. As a **visitor on GitHub**, I want **the README to explain quick setup, the loop, and how the harness (AGENTS.md + skills + `.agents/`) fits together**, so that **I understand it before installing**.

**Help & onboarding**

18. As a **new user**, I want **a Help page inside loopboard that explains the loop, the folder map, statuses and assignee, and shortcuts**, so that **I learn the workflow where I use it**.
19. As a **user setting up another repo**, I want **to copy the setup prompt from Help with one click**, so that **I don't go back to GitHub**.
20. As a **user who opened a repo without the workflow**, I want **loopboard to show me how to set it up instead of an empty board**, so that **I know what to do next**.

**Issue and project IDs**

21. As a **developer running agents in parallel worktrees**, I want **new issue and project numbers to take my other branches into account**, so that **merges don't produce two #0091s**.
22. As a **developer**, I want **`loopboard check` to flag duplicate IDs and dangling references in verify and CI**, so that **collisions that slip through are caught before merge**.
23. As a **developer**, I want **`loopboard renumber` to fix a duplicate, including every reference to it**, so that **cleanup is one command**.

**Capture & navigation**

24. As a **developer**, I want **to press `C` and create an issue from its category template with the next free number**, so that **capturing an idea takes seconds**.
25. As a **developer**, I want **to create a project (PRD + WIP) from the UI**, so that **kickoff doesn't need an agent**.
26. As a **keyboard user**, I want **a ⌘K palette to jump to any issue, project, spec or workspace and run actions**, so that **I never hunt through the rail**.
27. As a **developer**, I want **to copy a ready-made agent prompt for an issue or project**, so that **handing work to my agent is one paste**.
28. As a **developer with several repos**, I want **a "Needs you" view across all workspaces**, so that **nothing waiting on me hides in a repo I didn't open today**.

**Editing**

29. As a **developer**, I want **to edit an issue in a rich-text editor like Linear**, so that **small changes don't need my code editor**.
30. As a **developer**, I want **a save to change only the lines I edited**, so that **git diffs stay clean and agent-authored formatting survives**.
31. As a **developer**, I want **to switch to raw markdown**, so that **tables and unusual constructs stay editable**.
32. As a **developer**, I want **to edit frontmatter through fields (title, status, assignee, labels, project, parent)**, so that **I never break the YAML**.
33. As a **developer**, I want **a warning when an agent changed the file while I was editing, with Reload, Compare and Overwrite**, so that **neither of us silently loses work**.
34. As a **developer**, I want **to edit PRDs, WIPs and specs with the same editor**, so that **every document the board shows is editable**.
35. As a **developer**, I want **to type `#` and pick an issue to link**, so that **references stay correct**.

**Structure & insight**

36. As a **developer**, I want **to see which issues block an issue and which it blocks**, so that **I pick work that is actually unblocked**.
37. As a **developer**, I want **a warning on a todo whose parent isn't done**, so that **agents don't start blocked work**.
38. As a **developer**, I want **a projects overview with progress per project and per phase, last session and the count needing a human**, so that **I see where every project stands at a glance**.
39. As a **developer**, I want **to see the commits and branches that mention an issue, and the history of its file**, so that **I know what the agent actually did**.
40. As a **developer with hundreds of issues**, I want **a dense list view grouped by status, project or label**, so that **large repos stay scannable**.
41. As a **developer**, I want **to save filtered views per workspace**, so that **recurring questions ("bugs in review") are one click**.

**Look & feel**

42. As a **developer**, I want **a dark theme that follows my system setting, with a toggle**, so that **loopboard fits my setup**.
43. As a **contributor or agent changing UI**, I want **a Brand Kit that codifies tokens, type and components**, so that **new UI stays consistent**.

**Open source**

44. As a **visitor**, I want **this repo to use the workflow on itself**, so that **I see real PRDs, issues and specs instead of lorem ipsum**.
45. As a **user who found a bug**, I want **to file a GitHub Issue**, so that **reporting doesn't require learning the file format**.
46. As an **upstream skill author**, I want **my work credited with its license**, so that **reuse is honest**.
47. As an **adopter**, I want **a permissive license**, so that **I can use and fork loopboard freely**.

**Review loop and harness upgrades** (added 2026-10-04)

48. As a **solo developer**, I want **agents to close verified issues as `done` themselves**, so that **finished work doesn't pile up in `in-review` waiting for a review that never happens**.
49. As a **solo developer**, I want **`in-review` to mean "waiting on me" (always assigned to human, with what to check)**, so that **the few issues that really need my eyes stand out**.
50. As a **developer**, I want **optional `reviewed` and `deployed` dates on issues, shown on the board, with a "done · not reviewed" filter and one-click "mark reviewed"**, so that **review is a queue I work through when I choose**.
51. As a **developer with running harnesses**, I want **to say "upgrade my loopboard harness" and have my agent merge the latest skills and conventions into my repo**, so that **improvements arrive without overwriting my customizations**.
52. As a **developer**, I want **workflow changes shipped as numbered migrations that ask before bulk edits (e.g. closing 340 stale in-review issues)**, so that **I know what changes in my repo and stay in control**.

## Implementation decisions

- **Distribution: npx CLI + local Node server.** `npx loopboard` starts a
  server on 127.0.0.1 and opens the browser. Chosen over a Mac app (code
  signing, notarization, one OS, porting the Node fs code) and a hosted site
  (File System Access API is Chromium-only, re-prompts each session, and moves
  every write into the browser). A desktop wrapper can later wrap the same
  server (backlog).
- **One request handler, two hosts.** API logic moves out of the Vite plugin
  into a framework-free handler on Node's request/response types. The Vite dev
  plugin and the CLI's production server both mount it; production also serves
  the built client as static files.
- **Local-only security.** Bind 127.0.0.1. Reject requests whose `Host` isn't
  the bound loopback address (DNS rebinding) and mutating requests whose
  `Origin` isn't the app's own. No auth, no accounts, no telemetry.
- **Workspace registry.** A per-user config file (XDG config dir; `%APPDATA%`
  on Windows) stores `{ id, name, repoPath, root }` per workspace. Starting the
  CLI registers the given repo and selects it. API routes and client URLs are
  workspace-scoped (`/api/w/:id/…`, `/w/:id/…`). The id is the repo folder's
  slug, deduplicated.
- **Root detection.** The user always selects the repo root. Detection order:
  `.agents/issues`, then `ai/issues`, else a setup hint. The resolved root is
  stored with the workspace. `.agents/` is the default for new setups (one home
  for skills and work); agents find it because AGENTS.md names the path, not
  because grep finds hidden folders.
- **Fixed vocabulary.** Status, assignee and category vocabularies stay
  exactly as the issues README defines them. loopboard is opinionated, and the
  skills depend on the vocabulary.
- **Sequential, branch-aware IDs.** 4-digit issue IDs and 2-digit project IDs
  stay. One allocator computes the max across the working tree and archive,
  every worktree, every local branch and the remote-tracking refs, and falls
  back to a folder scan outside git. It is exposed as `loopboard next-id`
  (skills call it) and used by UI create. `loopboard check` flags duplicates
  and dangling references; `loopboard renumber` rewrites a number everywhere it
  is referenced. Existing repos need no migration.
- **Live updates.** One file watcher per workspace with a connected client;
  changes are pushed over Server-Sent Events and the client refetches that
  workspace (debounced). The Refresh button goes away.
- **Writes and conflicts.** Every document read returns a content hash; every
  write sends the hash it started from. On mismatch the server answers 409 with
  the current disk content, and the client offers Reload / Compare / Overwrite.
  Writes are atomic (temp file + rename). The existing targeted frontmatter
  rewrite (status, assignee, priority) stays for drag-and-drop and extends to
  title, labels, project and parent.
- **WYSIWYG with block splice.** Rich-text editor (TipTap or Milkdown, picked
  in its slice). The file is parsed into top-level blocks with source offsets;
  on save only blocks the user changed are re-serialized and spliced into the
  original text, so untouched lines stay byte-exact. A Source toggle edits raw
  markdown. Frontmatter is never in the rich-text surface; it is form fields.
- **init and upgrade.** The package ships this repo's own `.agents/` READMEs,
  templates and core skills as the scaffold, so the dogfood is exactly what
  users get. `init` never overwrites. It writes a managed block between
  markers in AGENTS.md (creating AGENTS.md, and a CLAUDE.md pointing to it, if
  missing). It links `.claude/skills` and `.cursor/skills` to `.agents/skills`
  (copying where symlinks fail, e.g. Windows) and writes an agent-facing
  `SETUP.md`. `--upgrade` keeps a manifest of shipped file hashes, skips
  locally edited files unless `--force`, and never touches issues, projects or
  specs content.
- **Skill set.** Core: grill-me, grill-with-docs, to-prd, to-issues,
  implement, triage, upgrade-harness. Extras (`--with-extras`): tdd, diagnose,
  improve-codebase-architecture, write-a-skill. caveman is dropped. A credits
  file lists the upstream source and license of every adapted skill.
- **Review loop.** When verify passes and the acceptance criteria are met,
  the agent closes the issue as `done`. `in-review` keeps its place in the
  fixed vocabulary but narrows to "needs a human check before it counts":
  always `assignee: human`, with a `## Review` section saying what to check.
  Optional `reviewed:` / `deployed:` frontmatter dates record those events;
  agents never set `reviewed`. Chosen over dropping `in-review` (no status left
  for "built, waiting for my manual check") and over a review tool alone (the
  queue still grows if nobody reads it).
- **Harness upgrades via migrations.** Workflow changes ship as numbered
  migrations in a migrations file (what changed, why, how to apply, which
  steps need confirmation). A harness records its level in an AGENTS.md
  marker. The `upgrade-harness` skill merges upstream skills and READMEs into
  local, possibly customized copies (adapting the root path), applies pending
  migrations and asks before bulk data edits. `init --upgrade` only handles
  untouched files; judgment stays with the agent.
- **Docs have one source.** The Help page renders markdown from a docs folder
  bundled at build time. The README links the same files, and the setup prompt
  lives in one file used by the README, Help and the empty state.
- **Contribution flow.** GitHub Issues (bug and feature forms) are the intake.
  An accepted report becomes a `.agents/issues` file with an optional
  `source: github#N` field; PRs reference `#NNNN` and close the GitHub issue.
- **Client routing.** A router replaces the single-screen state for
  workspaces, Help, projects overview and list views.
- **Theming.** The existing oklch tokens become the Brand Kit. Dark mode is a
  token override via `prefers-color-scheme`, plus a manual toggle remembered per
  browser.
- **Saved views** live per workspace in the user config, not in the repo,
  because they are personal.
- **License: MIT.**

## Testing decisions

- Tests exercise external behavior through public interfaces: the HTTP API,
  CLI commands and their exit codes, files on disk, and the rendered UI. No
  tests of internal helpers that may move.
- **Vitest**, against real temp directories and real temp git repos, for the
  deep modules: workspace registry and root detection, the shared API handler
  (including the Host/Origin guard), the scaffolder (init/upgrade idempotency,
  never-overwrite, manifest skip), the ID allocator (two worktrees, unmerged
  branch, no-git fallback), check and renumber, the document store (hash
  conflict, atomic write, create from template), the markdown block splice
  (round-trips every fixture and this repo's own `.agents/` with zero diff),
  and git activity.
- **Playwright** against a fixture `.agents/` for user flows: switch
  workspace, Help and copy prompt, live update after a file write, edit and
  conflict, ⌘K, create issue/project, theme toggle.
- **CI** runs `pnpm verify` plus e2e on macOS, Linux and Windows, plus a
  packed-tarball `npx` smoke test before release.
- Prior art: the fixture-based Vitest suites for mutate, wip, specs, inbox and
  colors.

## Out of scope

- **Team support** (named humans, custom statuses, permissions, branch-safe
  IDs for many committers). loopboard targets solo developers by design: local
  files and readable sequential numbers only make sense for one human steering
  agents. Revisit only together with a new ID and collaboration model.
- **Random or non-sequential IDs.** Considered (`k7f2-slug`); rejected to keep
  readable, ordered numbers. The branch-aware allocator covers the solo
  parallel-worktree case.
- **Mac desktop app.** Backlog (#0037). npx covers every OS without signing;
  a wrapper can reuse the server later.
- **Public hosted demo.** Backlog (#0038). Needs a static export and a
  read-only UI state; not required for launch.
- **Cloud sync, accounts, auth.** Files and git are the sync layer.
- **Launching agents from loopboard.** Hand-off is a copied prompt; agents run
  in the user's own tool.
- **Sprints/cycles, estimates, time tracking.** Projects are the time box.
- **Two-way sync with GitHub Issues, Linear or Jira.** GitHub Issues are
  intake only; `.agents/` stays canonical.
- **Auto-archive on `done`.** The project ship gate stays the archive trigger.
- **Telemetry.** Nothing leaves the machine.

## Further notes

- **Launch gate:** the first public release (repo public + npm) happens only
  after every phase ships. This was the maintainer's choice: one complete launch
  over an early 0.1.
- **Dogfooding:** the lorem/ipsum examples are deleted. This PRD is project
  01, its issues start at #0001, and they were filed in `.agents/` before the
  conventions moved there (#0002).
- **Name:** loopboard, after the session loop. It was free on npm on
  2026-10-04; reserving it is #0001.
