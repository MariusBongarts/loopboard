---
id: 0043
title: Cover every spec scenario end to end, the CLI included
category: task
status: done
assignee: agent
project: 01-open-source-launch
phase: 8
labels: [testing]
created: 2026-10-05
---

## What needs to change

Every `### Scenario:` in `.agents/specs/` gets a Playwright test, so no
coverage row stays ❌. The CLI scenarios (§ 1, § 8, § 10) run the built
`loopboard` binary against temp repos and git, not just the unit-level
functions.

## Why

The specs are the contract a contributor reads first. Rows marked ❌ while
the behavior only had unit tests said "untested" when the user-facing path
(the binary, the browser) never ran in CI.

## Acceptance criteria

- [x] No ❌ left in any `## E2E coverage` table; 🟡 rows name what is not asserted
- [x] `tests/e2e/cli.spec.ts` runs the built binary (global setup builds it)
- [x] Rail, board, drawer, backlog, specs view and failed-write scenarios covered
- [x] `pnpm verify` and `pnpm test:e2e` pass

## Out of scope

- Browser auto-open (`--no-open` in tests); the packed-tarball smoke stays in `pnpm smoke`

## Notes

- `#NNNN` in the drawer body became clickable on the way (linkify).
- Fixes found by the new tests: the backlog's Promote button had no clean
  accessible name, `?spec=` links were ignored before specs loaded, and a
  successful reload wiped a failed write's error banner.
