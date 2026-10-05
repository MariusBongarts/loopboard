# AGENTS.md

## Project overview

loopboard is a local, Linear-like board for the markdown issues, PRDs and specs
that a solo developer and their coding agents keep in a repo's `.agents/`
folder. This repo is also the reference example of that workflow: its own
`.agents/` holds the PRD and issues that build loopboard (see
[`.agents/projects/01-open-source-launch/prd.md`](.agents/projects/01-open-source-launch/prd.md)).
The block below is exactly what `loopboard init` puts into other repos.

<!-- loopboard:start — managed by `loopboard init` / upgrade-harness; edit outside these markers -->
<!-- loopboard:migration M002 -->
## Workflow

Issues, PRDs and specs live in `.agents/` as markdown; `npx loopboard` shows
them on a board.

**Project vs. issue.** Open a **project** at `.agents/projects/NN-slug/` when
work has several decisions to lock up-front (it gets a PRD). Single fixes or
chores → a standalone issue in `.agents/issues/`. Move issues with the
[`triage`](.agents/skills/triage/SKILL.md) skill.

**Conventions live next to the work — load only when needed:**

- [`.agents/projects/README.md`](.agents/projects/README.md) — project
  structure (`prd.md` + `wip.md`), kickoff, ship gate, numbering.
- [`.agents/issues/README.md`](.agents/issues/README.md) — issue file shape,
  category templates, statuses, assignee, numbering.

**Session loop**

1. Read `wip.md` "Current focus" → pick a `todo` issue → flip to
   `in-progress`.
2. Implement as a **vertical slice** (end-to-end, not one layer).
3. Run the verify command (Build & test). If it passes and every acceptance
   criterion is met, flip to `done`. If it needs a human check you can't do
   (manual UI, OAuth, judgment), flip to `in-review` + `assignee: human` with
   a `## Review` section. Append a session entry to `wip.md` either way.
4. The maintainer reviews when they choose (optional `reviewed:` date). On
   project ship, archive issues to `.agents/issues/_archive/`.
5. Update specs in `.agents/specs/_specs.md` if you touched user-facing logic.

**Load when the task matches:**

- **User-facing behavior** → the relevant spec indexed in
  [`.agents/specs/_specs.md`](.agents/specs/_specs.md); follow its "How to
  update this spec".
- **Architecture** → [`.agents/architecture/_architecture.md`](.agents/architecture/_architecture.md);
  follow its "How to update these docs".
- **Coding standards** → the matching file in [`.agents/rules/`](.agents/rules/).
- **UI/UX work** → the design references in [`.agents/design/`](.agents/design/).
<!-- loopboard:end -->

## Rules

### General — every task

1. **Coding standards**
   - Load TypeScript rules from [`.agents/rules/typescript.md`](.agents/rules/typescript.md).
   - Prefer named exports over default exports.
   - Never add huge inline comments, instead keep it minimal and reference the issue or project.
   - Apply DRY rigorously — extract shared helpers/UI to composables before duplicating; flag the extraction option proactively.
2. **Testing**
   - Vitest for units and modules (real temp dirs, real git where relevant).
   - Playwright for user-facing behavior; every spec scenario row names its test.

### Specific — only when the task matches

1. **IF YOU WORK ON FRONTEND COMPONENTS**
   → Load [`.agents/rules/components.md`](.agents/rules/components.md).
2. **IF YOU WORK ON UI/UX CHANGES**
   → Load and follow the Brand Kit at `.agents/design/Brand Kit.html`.
3. **IF YOU CHANGE THE WORKFLOW CONVENTIONS** (statuses, frontmatter fields,
   the session loop, folder layout — anything an existing harness must *do*
   something about)
   → Add an entry to [`MIGRATIONS.md`](MIGRATIONS.md) in the same change and
   move the migration marker above to it. Plain wording changes to shipped
   skills, READMEs or `scaffold/` need no migration: upgrade-harness merges
   them. The managed block above must stay identical to
   [`scaffold/AGENTS.block.md`](scaffold/AGENTS.block.md) (a test checks it).

## Build & test

- Install: `pnpm install`
- Dev: `pnpm dev` (registers this repo's `.agents/`; `BASE_PATH=<path>` registers another repo)
- Test: `pnpm test` (Vitest) · E2E: `pnpm test:e2e` (Playwright, fixture repos)
- Lint: `pnpm lint:fix`
- Verify: `pnpm verify` (run after every task)
