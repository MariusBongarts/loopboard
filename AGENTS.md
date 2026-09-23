# AGENTS.md

## Project overview

Issue Tracker that can be used for several projects by defining a ai/* folder.

## How to work

**Project vs. issue.** Open a **project** at `ai/projects/NN-slug/` when work
has multiple decisions to lock up-front (benefits from a PRD). Single fixes
or chores → standalone issue at `ai/issues/`. When working on issues, move them using the triage `.agents/skills/triage/SKILL.md` skill.

**Conventions live next to the work — load only when needed:**

- [`ai/projects/README.md`](ai/projects/README.md) — project structure
  (`prd.md` + `wip.md`), kickoff, ship gate, numbering.
- [`ai/issues/README.md`](ai/issues/README.md) — issue file shape, category
  templates, status vocabulary, numbering.

**Session loop**

1. Read `wip.md` "Current focus" → pick a `todo` issue → flip to
   `in-progress`.
2. Implement as a **vertical slice** (end-to-end, not one layer).
3. Flip to `in-review`; append a session entry to `wip.md`.
4. Maintainer verifies → `done`. On project ship, archive issues to
   `ai/issues/_archive/`.
5. Update specs in `ai/specs/_specs.md` if you touched user-facing logic

## Rules

We have two types of rules:

1. **General rules** — load by default.
2. **Specific rules** — only consult when the current task matches a trigger.

### 1. General rules

Follow these for every task:

1. **Coding standards**
   - Load TypeScript rules from [`ai/rules/typescript.md`](ai/rules/typescript.md).
   - Prefer named exports over default exports.
   - Never add huge inline comments, instead keep it minimal and reference the issue or project.
   - Apply DRY rigorously — extract shared helpers/UI to composables before duplicating; flag the extraction option proactively.

2. **Testing requirements**
   - Use Vitest for unit tests.
   - Use Playwright for e2e and to test user-facing behavior specs.
   - Always run `pnpm verify` before declaring a task complete.

3. **Build & test**
   - Install: `pnpm install`
   - Dev: `pnpm dev`
   - Test: `pnpm test`
   - Lint: `pnpm lint:fix`
   - Verify: `pnpm verify` (run always after a task)

### 2. Specific rules

Only consult these when the current task matches one of the listed triggers:

1. **IF YOU WORK ON USER-FACING BEHAVIOR**
   → Read the relevant product specification indexed in
   [`ai/specs/_specs.md`](ai/specs/_specs.md). Follow the update rules defined
   in that file under "How to update this spec". Update Playwright tests if
   possible.

2. **IF YOU WORK WITH FIREBASE**
   → Load [`ai/rules/firebase.md`](ai/rules/firebase.md).

3. **IF YOU WORK ON FRONTEND COMPONENTS**
   → Load [`ai/rules/components.md`](ai/rules/components.md).

4. **IF YOU WORK ON UI/UX CHANGES**
   → Load and follow the Brand Kit at `ai/design/Brand Kit.html`.

5. **IF YOU NEED TO UNDERSTAND OR CHANGE THE ARCHITECTURE**
   → Read the relevant architecture doc indexed in
   [`ai/architecture/_architecture.md`](ai/architecture/_architecture.md).
   Follow the update rules defined in that file under "How to update these
   docs".
