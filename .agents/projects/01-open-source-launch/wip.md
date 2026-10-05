# loopboard 1.0 — Open-source launch — WIP

> Last updated: 2026-10-05
> PRD: [./prd.md](./prd.md)
> Status: in-progress

## Current focus

All agent work is done; what's left needs the maintainer. Every spec scenario
now has an e2e test, the CLI included
([#0043](../../issues/0043-cover-every-spec-scenario-end-to-end.md)), and a
visual review pass landed
([#0044](../../issues/0044-visual-review-polish.md)). Waiting on you:
reserve the name ([#0001](../../issues/0001-reserve-the-loopboard-name.md)),
push + CI (#0006, #0035), the fresh-agent prompt check (#0013), a real
upgrade-harness run (#0041), then launch (#0036) — after project 02's UX
overhaul. The README demo is recorded and re-records itself (#0036 notes);
what's left of #0036 is going public. Read
"Questions for the maintainer" below first.

## Phases

### Phase 1 — Clean slate

Goal: the repo is an honest, credited, tested example of its own workflow.

- [ ] [#0001 Reserve the loopboard name on npm and GitHub](../../issues/0001-reserve-the-loopboard-name.md) — todo (human)
- [x] [#0002 Move workflow conventions from ai/ to .agents/ and drop the lorem examples](../../issues/0002-move-conventions-to-dot-agents.md) — done
- [x] [#0003 Rename the tracker to loopboard and remove personal setup](../../issues/0003-rename-to-loopboard.md) — done
- [x] [#0004 Add the MIT license, skill credits and the contribution flow](../../issues/0004-license-credits-and-contribution-flow.md) — done
- [x] [#0005 Write loopboard's own specs, architecture docs and rules](../../issues/0005-dogfood-specs-architecture-and-rules.md) — done
- [ ] [#0006 Add CI and a Playwright harness on a fixture workspace](../../issues/0006-ci-and-playwright-harness.md) — in-review (human: push + CI)
- [x] [#0039 Close verified issues as done; review and deploy become optional markers](../../issues/0039-close-verified-issues-as-done.md) — done
- [ ] [#0041 Upgrade running harnesses with an upgrade-harness skill and numbered migrations](../../issues/0041-upgrade-harness-skill-and-migrations.md) — in-review (human)

### Phase 2 — Run anywhere

Goal: `npx loopboard` works in any repo, and one server switches between all of them.

- [x] [#0007 Run loopboard from any repo with npx](../../issues/0007-run-loopboard-from-any-repo.md) — done
- [x] [#0008 Remember workspaces and switch between them from the top-left](../../issues/0008-remember-and-switch-workspaces.md) — done
- [x] [#0009 Add, rename and remove workspaces in the UI](../../issues/0009-manage-workspaces-in-the-ui.md) — done
- [x] [#0010 Update the board live when files change on disk](../../issues/0010-live-updates-from-file-changes.md) — done

### Phase 3 — Setup & onboarding

Goal: a developer goes from an empty repo to a working board with one pasted prompt.

- [x] [#0011 Scaffold the workflow in any repo with loopboard init](../../issues/0011-scaffold-with-loopboard-init.md) — done
- [x] [#0012 Refresh skills and templates with loopboard init --upgrade](../../issues/0012-upgrade-with-init-upgrade.md) — done
- [ ] [#0013 Rewrite the README around the quick-setup prompt](../../issues/0013-readme-and-setup-prompt.md) — in-review (human: fresh-agent check)
- [x] [#0014 Explain the workflow on an in-app Help page](../../issues/0014-in-app-help-page.md) — done
- [x] [#0015 Guide new workspaces with a setup empty state](../../issues/0015-setup-empty-state.md) — done

### Phase 4 — Collision-free IDs

Goal: parallel agents in worktrees never produce duplicate issue or project numbers.

- [x] [#0016 Allocate branch-aware IDs with loopboard next-id](../../issues/0016-branch-aware-next-id.md) — done
- [x] [#0017 Flag duplicate IDs and dangling references with loopboard check](../../issues/0017-loopboard-check.md) — done
- [x] [#0018 Fix duplicates with loopboard renumber](../../issues/0018-loopboard-renumber.md) — done

### Phase 5 — Capture & navigation

Goal: create, find and hand off work without leaving the board.

- [x] [#0019 Create an issue from the board](../../issues/0019-create-issue-from-the-board.md) — done
- [x] [#0020 Create a project from the UI](../../issues/0020-create-project-from-the-ui.md) — done
- [x] [#0021 Jump and act with a ⌘K command palette](../../issues/0021-command-palette.md) — done
- [x] [#0022 Copy an agent prompt for any issue or project](../../issues/0022-copy-agent-prompt.md) — done
- [x] [#0023 See what needs me across all workspaces](../../issues/0023-cross-workspace-needs-you.md) — done
- [x] [#0040 Show reviewed and deployed markers and mark an issue reviewed in one click](../../issues/0040-review-and-deploy-markers-on-the-board.md) — done

### Phase 6 — In-app editing

Goal: every document is editable in place, without noisy diffs or lost agent edits.

- [x] [#0024 Edit an issue's markdown with conflict detection](../../issues/0024-edit-markdown-with-conflict-detection.md) — done
- [x] [#0025 Splice edited markdown blocks back into the original file](../../issues/0025-markdown-block-splice.md) — done
- [x] [#0026 Edit issues in a WYSIWYG editor](../../issues/0026-wysiwyg-issue-editor.md) — done
- [x] [#0027 Edit PRDs, WIPs and specs in the same editor](../../issues/0027-edit-prd-wip-and-specs.md) — done

### Phase 7 — Structure & insight

Goal: relations, progress, git history and dense views for large repos.

- [x] [#0028 Show blocking relations and sub-issues](../../issues/0028-blocking-relations-and-sub-issues.md) — done
- [x] [#0029 Track project progress on a projects overview](../../issues/0029-projects-overview-with-progress.md) — done
- [x] [#0030 Show git activity on an issue](../../issues/0030-git-activity-on-issues.md) — done
- [x] [#0031 Browse issues in a grouped list view](../../issues/0031-grouped-list-view.md) — done
- [x] [#0032 Save filtered views per workspace](../../issues/0032-saved-views.md) — done

### Phase 8 — Identity & launch

Goal: a codified look, dark mode, a reliable release, and the public launch.

- [x] [#0033 Codify the look in a Brand Kit with a loopboard wordmark](../../issues/0033-brand-kit-and-wordmark.md) — done (wordmark B, project 02)
- [x] [#0034 Add a dark theme](../../issues/0034-dark-theme.md) — done
- [ ] [#0035 Automate npm releases and test the packed CLI on every OS](../../issues/0035-release-pipeline.md) — in-review (human: repo URL, NPM_TOKEN, first CI run)
- [x] [#0043 Cover every spec scenario end to end, the CLI included](../../issues/0043-cover-every-spec-scenario-end-to-end.md) — done
- [x] [#0044 Visual review — board overflow hint, list chips, relation dots, tighter baselines](../../issues/0044-visual-review-polish.md) — done
- [ ] [#0036 Record the README demo and go public](../../issues/0036-launch.md) — todo (human: go public; demo done)

### Backlog

- [ ] [#0037 Wrap loopboard in a Mac desktop app](../../issues/0037-mac-desktop-app.md) — backlog
- [ ] [#0038 Host a read-only public demo of loopboard](../../issues/0038-public-read-only-demo.md) — backlog

## Activity log

### 2026-10-05 — #0036 README demo, #0059

- #0036: the README hero is a scripted recording, not a hand-made GIF.
  `pnpm demo` starts the dev server on a demo repo (`scripts/demo/workspace`,
  dates relative to today), and a storyboard edits issue files like an agent
  — #0016 to done, #0017 to in-review for a human, who opens it — while
  Playwright captures the live board step by step with a drawn terminal and
  pointer. Light and dark GIFs (~420 KB each, 17.6 s) in `docs/media/`, a
  `<picture>` in the README. Encoder in pure JS (gifenc + pngjs, exact
  palette for flat UI colours); output is byte-identical for the same UI, so
  `demo.yml` opens a PR only when the demo changed. Vitest:
  `tests/demo-gif.test.ts`.
- #0059: the recording showed #0017 "After #0014" instead of #0016 —
  js-yaml read `parent: 0016` as octal. `parent` now comes from the raw
  frontmatter line; this repo's #0036 had pointed at #0029.
- Launch gate checked: #0001, #0006, #0013, #0035, #0041 still need you;
  #0037/#0038 are backlog ideas inside the project (move or `wontfix` them
  before the "all done" check).

### 2026-10-05 — #0043, #0044 (autonomous review rounds)

- #0043: Playwright for every ❌ row — rail (chips, search, j/k, pins,
  resize), board (pane, columns, archived, filters, strips, tabs), drag to
  position, assignee toggle, failed write, drawer, backlog, specs filters.
  `tests/e2e/cli.spec.ts` drives the built binary (global setup runs
  `pnpm build:app`) for §§ 1, 8, 10 against temp repos and git. No ❌ left.
  The tests found three bugs: Promote's accessible name, `?spec=` ignored
  before load, a reload wiping a write's error banner.
- #0044: visual review. Board fades the edge hiding columns (§ 3 scenario);
  list-row chips match card chips; "Blocks" rows use a status dot, not a
  checkbox look-alike; baselines were stale but passing at 1% → 0.2% and
  regenerated.
- Review findings fixed on the way: `#NNNN` in the drawer body is
  clickable, unknown ids stay plain text (drawer, focus, notes); `check`
  ignores mentions in code; project progress leaves out backlog ideas and
  phases with nothing scheduled (the WIP's "Backlog" heading got a bar); a
  done parent reads "After", not "Blocked by"; the empty state offers "New
  issue"; the switcher has a proper accessible name; concurrent registry
  writes no longer collide on one temp file or drop an update (seen in e2e
  logs). `isClosed()` replaces three copies of the done/wontfix set.
- First-run walkthrough on a scratch repo: `init` → `loopboard` → empty
  state → New issue → drawer. No dead ends found besides the ones above.

### 2026-10-04 — #0042, #0007–#0009 (autonomous run)

- #0042: one `parseFrontmatter` helper bypasses gray-matter's cache; Vitest
  regression + § 1 e2e with a malformed fixture file.
- #0007: shared API handler, production server and `loopboard [path]` CLI
  (start, or hand off to the running server); smoke-tested from a packed
  tarball. `files` allowlist pulled forward from #0035.
- #0008/#0009: workspace registry, `/api/w/:ws/*` routes, `vue-router`,
  top-left switcher with Add (folder suggestions) and Manage (rename,
  remove). Specs § 1 and § 7, e2e on a `.agents/` and a legacy `ai/` fixture.
- #0010: SSE `events` route over a debounced recursive watcher; the live dot
  replaces Refresh. Spec § 2 scenario rewritten; e2e moves a card by writing
  its file.
- #0011/#0012: `loopboard init` (+ `--with-extras`, `--upgrade`, `--force`,
  `--dry-run`) from `server/init.ts`; generic starters in `scaffold/`; this
  repo's AGENTS.md embeds the shipped block. Spec § 8 (Vitest-covered).
- #0013–#0015: README rewritten around `docs/setup-prompt.md`; `/help` from
  `docs/`; shortcut registry; welcome, missing-root and first-steps states.
  Spec § 9 (all ✅). #0013 waits on a fresh-agent run of the prompt.
- #0016–#0018: `next-id`, `check`, `renumber` over working tree, worktrees
  and all branches (real temp git repos in Vitest). Spec § 10.
- #0019–#0023, #0040: create issue (`C`) and project, ⌘K palette (also the
  way back to wontfix), copy agent prompt, cross-workspace Needs you, review
  markers + queue. Found and fixed: board writes dropped the blank line after
  the frontmatter. Spec § 11 plus § 4/§ 7 additions; 23 e2e tests.
- #0024–#0027: document store with hash-checked saves and conflict
  resolution; block splice (formatting-only differences keep original bytes);
  TipTap rich editor with fields form and `#` links; PRD/WIP/spec editing.
  Found and fixed a load/typing race. Spec § 12; 29 e2e tests.
- #0028–#0032: relations (badge, drawer strip, hide waiting), projects
  overview with per-phase progress, git history in the drawer, the list view
  with URL filters, saved views in the user config. Rail is destinations
  only now. Specs §§ 3, 5, 13; 35 e2e tests.
- #0033/#0034: Brand Kit (rules + live tokens), self-hosted fonts, dark
  theme with a contrast checker in verify, visual regression baselines.
  Review round: board columns didn't fit → empty columns shrink and the feed
  can hide; drawer checklists toggle with one click.

### 2026-10-04 — #0006, review loop, harness upgrades

- #0006: Playwright runs against a temp copy of a fixture workspace (port
  5199); first tests cover the feed, drag-to-status and the Specs view. CI
  runs verify + e2e on three OSs (not run yet — no remote). Found #0042:
  malformed issue files come back as ghost issues after the first read.
- Maintainer decision: agents close verified issues as `done`; `in-review`
  only means "waiting on a human"; `reviewed:`/`deployed:` become optional
  dates; running harnesses upgrade via an `upgrade-harness` skill and
  numbered migrations. PRD stories 48–52 added; filed #0039–#0041.
- #0039 done under its own new rule: AGENTS.md, the issues and projects
  READMEs, implement, triage and the glossary now close verified issues as
  `done`; `in-review` = human check with a `## Review` section;
  `reviewed:`/`deployed:` documented.
- #0041: `MIGRATIONS.md` (M001 conventions, M002 review loop), the
  `upgrade-harness` skill (report / upgrade modes, merge by intent, path
  normalization for `ai/` roots, confirm-first data steps), AGENTS.md marker
  M002 and a rule that workflow changes ship with a migration. Report-mode
  dry run on webhighlights matched expectations. In review with the
  maintainer: upgrade mode needs a real customized harness.

### 2026-10-04 — #0005

- Specs written from the code: index with coverage legend and update rules,
  glossary, and six sections (running, rail and feed, project pane and
  board, changing issues, drawer and backlog, specs view) — 33 scenarios, all
  `❌` with Vitest coverage named in Notes. The README now links to them.
- Two known gaps recorded rather than described as working: wontfix has no
  column to drop on since the old 0069, and "/" never reaches the Specs search.
- Architecture: index, overview, server, client (incl. every `localStorage`
  key) and workflow docs, plus ADRs 0001–0005 for this PRD's decisions.
- Rules: `typescript.md` and `components.md` reflect this repo; every
  AGENTS.md link resolves except the Brand Kit (#0033).

### 2026-10-04 — #0004

- MIT `LICENSE` and `CREDITS.md` added. Provenance checked against
  mattpocock/skills (MIT): grill-me, tdd, diagnose,
  improve-codebase-architecture and write-a-skill are near-verbatim copies;
  grill-with-docs, to-prd and to-issues are rewrites of the same-named
  skills; implement and triage are original. Each adapted skill now ends
  with an attribution line.
- caveman removed (it was Apache-2.0 JuliusBrussee/caveman, vendored via
  mattpocock/skills) along with its `.claude/` and `.cursor/` links.
- `CONTRIBUTING.md` and GitHub bug/feature forms (blank issues off) describe
  the GitHub Issue → `.agents/issues` → PR flow. `source: github#N` is
  documented in the issues README, templates and to-issues; a new Vitest
  suite proves the tracker reads it and keeps it on status rewrites.
- Added to #0011: `init` must ship the MIT notice with the adapted skills.

### 2026-10-04 — #0003

- Package renamed to `loopboard` with description, keywords and
  `engines: node >=20`; the personal `dev:*` scripts are gone. Other repos
  open with `BASE_PATH=../repo/.agents pnpm dev`.
- `pnpm dev` now falls through to the next free port (maintainer request):
  verified with three servers at once (5180 → 5181 → 5182).
- Rail brand, page title, Vite plugin name and server log prefix say
  loopboard. README stripped of monorepo leftovers (`tools/tracker`,
  `pnpm tracker:*`, the `06-issue-tracker` PRD link, `ai/` paths).
- Kept `private: true` (moved to #0035), postponed `repository` until #0001,
  and kept the `tracker.*` storage keys so the maintainer's UI state survives.

### 2026-10-04 — #0002

- Moved the issues/projects READMEs, templates and `_archive/` into
  `.agents/`; deleted the lorem projects, dummy issues 0064–0069;
  removed `ai/`.
- Skills, READMEs and templates now point at `.agents/` (skill-relative links
  `../../`). Also removed MorningMail/Firebase/Firestore leftovers from
  grill-with-docs, implement and improve-codebase-architecture.
- AGENTS.md rewritten for loopboard; Firebase trigger gone. Links to specs,
  architecture and rules are expected to resolve with #0005.
- One `DEFAULT_BASE_PATH = ".agents"` constant now drives the server readers,
  the plugin and the Vite config; the client's displayed issue path follows.
- Not touched: README (still documents `ai/` paths) — #0003 strips it.

### 2026-10-04

- Kickoff via a grill-me session; PRD locked. Key calls: an npx CLI with a
  local server (Mac app and hosted site rejected), one server with a saved
  workspace list and a top-left switcher, `.agents/` as the default root with
  `ai/` detected, `init` + a short paste prompt, an in-app Help page built from
  docs, a full WYSIWYG editor with block splice and hash-checked saves, every
  Linear-style feature in scope, MIT, solo developers only, and a launch only
  after all phases.
- IDs: considered short random IDs (`k7f2-slug`) for collision safety, then
  kept sequential numbers for readability and added a branch-aware allocator
  plus check/renumber instead.
- Issues were filed straight into `.agents/` (numbering restarts at #0001)
  before #0002 moves the conventions there.

## Questions for the maintainer

Collected while working autonomously. Each has the decision I took so work
could continue; overrule anything. Answered by the maintainer on 2026-10-05
(→ lines); UX follow-ups moved to project 02.

1. **M002 applied here.** #0002–#0005 moved `in-review → done` (verified when
   built). #0006 is `in-review` + human: CI only runs after a push.
2. ~~**CLI scenarios show ❌ in the Specs view.**~~ Resolved by #0043:
   `cli.spec.ts` runs the built binary, so those rows are real ✅/🟡 now.
3. **"Mine" → "You".** The board's assignee filter now reads Everyone / You /
   Agent and the create dialog says "You", matching "Needs you".
   → **Keep "You".**
4. **Agent tools.** `init` always links `.claude/skills`, and `.cursor/skills`
   only when the repo has `.cursor/`. Codex only reads AGENTS.md. Should init
   ask, or take a `--tools` flag?
   → **Keep auto-detect.**
5. **127.0.0.1 vs localhost.** The CLI prints and binds `127.0.0.1` (Node's
   fetch resolves `localhost` to `::1`), so its browser storage is separate
   from `pnpm dev` on `localhost`. Fine?
   → **Keep 127.0.0.1.**
6. **`dist/` prototypes.** Untracked HTML prototypes (dashboard, inbox, rail,
   tracker designs) sit in `dist/`; builds now go to `build/`, so nothing
   touches them. Keep, move into `.agents/design/`, or delete?
   → **Moved to `.agents/design/prototypes/`.**
7. **Board width.** Built: empty columns shrink to strips, the feed can hide,
   and the edge hiding columns fades (#0044). Still open: at ≤1280 px only
   two or three columns fit next to the feed (one at 1024). Should the feed
   auto-collapse below a breakpoint, or columns go down to ~180 px? I left
   it manual (⇤) so the feed never disappears unexpectedly.
   → **Keep manual.**
8. **Old blank-line bug.** Before #0040's fix, every board write deleted the
   blank line after the frontmatter, so issue files the tracker touched in
   your repos lack it. Harmless; upgrade-harness could normalize them. Want
   that as a migration step?
   → **Leave it.**
9. **Switcher counts.** The number next to a workspace is its live issue
   files (incl. done) — cheap to compute. Would "open issues" be more useful
   (costs a full read per workspace)?
   → **Keep the file count.**
10. **"Open in editor".** Not built: it needs a choice of `vscode://` vs
    `cursor://` (or a setting). Which editor(s)?
    → **VS Code + Cursor setting** (#0049).
11. **Rail = destinations.** The rail now shows Inbox, Needs you, Issues
    (the new list view), Projects (overview) and Specs, plus saved Views.
    "Sessions" and "Issues" as *feed filters* moved to the feed's chips only.
    Revert if you miss them in the rail.
    → **Feed filters back in the rail, chips removed** (#0047).
12. **Saved views are personal.** They live in `~/.config/loopboard/views/`,
    not the repo. Should teams of one ever want them in git (e.g.
    `.agents/views.json`)?
    → **Personal only.**
13. **Wordmark (#0033).** Pick A, B or C in the Brand Kit. A is applied
    for now; the favicon uses B's loop mark.
    → **B (mark + sans) under the new neutral look** (project 02).
14. **Visual baselines are macOS.** `visual.spec.ts` skips on Linux/Windows
    CI; the macOS CI job compares against renders from this machine, with a
    0.2% pixel tolerance (1% hid real changes). If CI's macOS fonts render
    differently, regenerate the baselines there once.
15. **#0013 needs you:** paste the README prompt into a fresh agent session in
    a throwaway repo once `npx loopboard` resolves.
16. **Backlog ideas don't count toward progress.** A project with parked ideas
    could never reach 100%, and the WIP's "### Backlog" heading drew an empty
    phase bar. Both are gone (spec § 3). Overrule if you want backlog in the
    total.
    → **Keep excluded.**
17. **Quick-created issues keep the template's guidance prose** ("Concise
    description of the technical change…") as their body. Honest but noisy,
    and an agent might read it as content. Proposal: create with headings
    and empty checklists only. Not changed — your call.
    → **Headings only** (#0057).
18. **"After #NNNN".** When the parent is done, the drawer's relation reads
    "After" instead of "Blocked by". Wording OK?
    → **Keep "After".**
19. **The e2e run builds first.** Playwright's global setup runs
    `pnpm build:app` (~10 s) so the CLI tests use the real binary, even when
    you run a single spec. Acceptable, or gate it behind the CLI spec only?
    → **Always build.**

## Deferred / out of scope (added during execution)

- None yet.

## Ship summary

(Filled in only when status flips to `shipped`.)
