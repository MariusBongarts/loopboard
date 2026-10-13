---
id: 0111
title: A test run registers the checkout as a workspace
category: bug
status: done
assignee: agent
labels: [testing, workspaces]
created: 2026-10-13
---

## Steps to reproduce

1. Check the repo out a second time (a git worktree or a fresh clone) and
   install.
2. Run `pnpm verify` (or `pnpm test`, or `pnpm exec vitest run` on one file)
   in it. Don't set `LOOPBOARD_CONFIG_DIR`.
3. Run `loopboard workspaces`, or open the workspace switcher of a running
   board.

## Current behavior

The checkout is in the registry and is the last-used workspace. Every test
run adds or re-selects it, so a board opened without a path lands in a
worktree instead of the repo the user worked in last, and `workspaces forget`
only helps until the next run. This is how throwaway worktrees end up in the
registry (#0099 added the command that removes them).

Vitest reads [`vite.config.ts`](../../vite.config.ts) and starts a Vite
server of its own from it. The config lists the dev plugin
([`server/plugin.ts`](../../server/plugin.ts)), whose `configureServer` hook
registers the checkout in the user's config directory, as `pnpm dev` is meant
to. The hook runs in Vitest's main process, before any test and outside the
config directory a test sets for itself.

## Expected behavior

Only `pnpm dev` and the CLI register a workspace. Running tests or a
type-check never writes to the user's registry.

## Acceptance criteria (verification)

- [x] Reproduction steps no longer reproduce the bug
- [x] Regression test added at the right seam (or absence of seam documented)
- [x] No `[DEBUG-...]` instrumentation left behind
- [x] A test that sets no config directory of its own can't reach the user's registry either
- [x] CONTRIBUTING and the architecture overview say which commands register a workspace

## Out of scope

- `pnpm dev` registering the clone: that is how the dev server finds its
  workspace
- Telling a worktree from its main checkout in the registry (#0080)

## Notes

- Only Vitest was affected. `vue-tsc --noEmit`, `vite build` and the contrast
  script never run the hook; Playwright, the smoke script and the demo
  recorder already set `LOOPBOARD_CONFIG_DIR`.
- Fixed in `vite.config.ts`: the API plugin is left out when Vitest loads the
  config (`process.env.VITEST`), and `test.env` points
  `LOOPBOARD_CONFIG_DIR` at a folder in the temp directory for every test.
- Vitest: `tests/registry-isolation.test.ts` starts a Vitest run with an
  empty config directory and checks that it stays empty. With the plugin back
  in the config that test fails.
