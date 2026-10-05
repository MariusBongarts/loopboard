# loopboard — User-Facing Specification

> A behavior-driven specification of what loopboard does, written in
> `GIVEN / WHEN / THEN / AND` form. It is the reference for *what the product
> does*, independent of how it is built; architecture lives in
> [`../architecture/_architecture.md`](../architecture/_architecture.md).
>
> Scope: running loopboard, workspaces, the rail and feed, the project pane
> and board, changing issues from the board, drawers, and the Specs view.

Start with [§ 0 — Conventions & Glossary](00-conventions-and-glossary.md) for
shared terminology.

## Table of Contents

- [0. Conventions & Glossary](00-conventions-and-glossary.md)
- [1. Running loopboard](01-running-loopboard.md)
- [2. Rail and feed](02-rail-and-feed.md)
- [3. Project pane and board](03-project-pane-and-board.md)
- [4. Changing issues from the board](04-changing-issues.md)
- [5. Issue drawer and backlog](05-issue-drawer-and-backlog.md)
- [6. Specs view](06-specs-view.md)
- [7. Workspaces](07-workspaces.md)
- [8. Setup and upgrades](08-setup-and-upgrades.md)
- [9. Help and onboarding](09-help-and-onboarding.md)
- [10. Issue and project numbers](10-issue-numbers.md)
- [11. Capture and commands](11-capture-and-commands.md)
- [12. Editing](12-editing.md)
- [13. List and saved views](13-list-and-views.md)
- [14. Look and feel](14-look-and-feel.md)

## E2E coverage

Every section file carries an `## E2E coverage` table near the top that maps
each scenario (by its `### Scenario:` heading) to its Playwright test. The
Specs view reads these tables and shows a weighted aggregate
(`✅ = 1, 🟡 = 0.5, ⏳ = 0, ❌ = 0`).

Tests live in [`tests/e2e/`](../../tests/e2e/), numbered by spec section, and
run with `pnpm test:e2e` against temp copies of the fixture repos in
[`tests/e2e/fixtures/`](../../tests/e2e/fixtures/) (a `.agents/` demo repo and
a legacy `ai/` repo) with their own config dir — never against this repo's
`.agents/` or your real workspace list. CI runs them on macOS, Linux and Windows.

| Spec section | Playwright file |
|---|---|
| § 1 — Running loopboard | [`01-running-loopboard.spec.ts`](../../tests/e2e/01-running-loopboard.spec.ts) |
| § 2 — Rail and feed | [`02-rail-and-feed.spec.ts`](../../tests/e2e/02-rail-and-feed.spec.ts) |
| § 3 — Project pane and board | [`03-project-pane-and-board.spec.ts`](../../tests/e2e/03-project-pane-and-board.spec.ts) |
| § 4 — Changing issues | [`04-changing-issues.spec.ts`](../../tests/e2e/04-changing-issues.spec.ts) |
| § 5 — Issue drawer and backlog | [`05-issue-drawer-and-backlog.spec.ts`](../../tests/e2e/05-issue-drawer-and-backlog.spec.ts) |
| § 6 — Specs view | [`06-specs-view.spec.ts`](../../tests/e2e/06-specs-view.spec.ts) |
| § 7 — Workspaces | [`07-workspaces.spec.ts`](../../tests/e2e/07-workspaces.spec.ts) |
| § 9 — Help and onboarding | [`09-help-and-onboarding.spec.ts`](../../tests/e2e/09-help-and-onboarding.spec.ts) |
| § 11 — Capture and commands | [`11-capture-and-commands.spec.ts`](../../tests/e2e/11-capture-and-commands.spec.ts) |
| § 12 — Editing | [`12-editing.spec.ts`](../../tests/e2e/12-editing.spec.ts) |
| § 13 — List and saved views | [`13-list-and-views.spec.ts`](../../tests/e2e/13-list-and-views.spec.ts) |
| § 14 — Look and feel | [`14-look-and-feel.spec.ts`](../../tests/e2e/14-look-and-feel.spec.ts), [`visual.spec.ts`](../../tests/e2e/visual.spec.ts) |

Status legend:

- ✅ — covered: the scenario's externally visible behavior is asserted
- 🟡 — partial: some assertions present; the scenario is richer than the test
- ⏳ — fixme: a test exists but is `test.fixme()`'d (see the open issue)
- ❌ — not yet: no Playwright assertion

Visual regression: [`visual.spec.ts`](../../tests/e2e/visual.spec.ts) compares the main screens in both
themes against PNG baselines in `tests/e2e/__screenshots__/` (macOS renders —
other platforms skip it; refresh with `pnpm test:e2e visual --update-snapshots`
after an intended UI change, and look at the new images before committing).

A `❌` is the honest record that a behavior is unasserted. Where Vitest covers
it, say so in Notes and keep the `❌` — the aggregate is about Playwright.

## How to update this spec

This spec is the source of truth for user-facing behavior. Any change that
adds, removes or alters something a user sees or does in loopboard MUST
update the relevant section file in the same change:

- new behavior → add a `### Scenario:` with a GIVEN/WHEN/THEN block and a row
  in that section's coverage table
- removed behavior → delete the scenario and its row
- changed behavior → edit the scenario (including copy, defaults, shortcuts,
  limits)
- a fixed known gap → remove it from the section's "Known gaps"

The scenario heading is the join key with the coverage table, so rename both
together. Landing a Playwright test includes flipping its row in the same PR.
Add a new area as a new numbered file and link it from the table of contents
above.
