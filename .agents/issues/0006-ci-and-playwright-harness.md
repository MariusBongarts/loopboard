---
id: 0006
title: Add CI and a Playwright harness on a fixture workspace
category: task
status: in-review
assignee: human
project: 01-open-source-launch
phase: 1
parent: 0002
labels: [ci, testing]
created: 2026-10-04
---

## What needs to change

- Add Playwright with a fixture `.agents/` workspace under the tests folder
  (several projects, every status, a spec with a coverage table).
- First e2e tests: the inbox lists fixture items; dragging a card to another
  column rewrites `status:` in the fixture file (on a temp copy).
- GitHub Actions: `pnpm verify` and the e2e suite on macOS, Linux and Windows
  for every PR and push to main.

## Why

AGENTS.md requires Playwright for user-facing behavior, but the repo has none.
Every later slice needs a harness to add its e2e coverage to.

## Acceptance criteria

- [x] `pnpm test:e2e` runs locally against the fixture, never against the real `.agents/` — a temp copy per run, served on port 5199, removed afterwards
- [ ] CI runs verify + e2e on the three OSs and is green — workflow added, not run yet: the repo has no remote. Needs `pnpm-workspace.yaml` committed (pnpm 11 build-script allowlist for esbuild)
- [x] Specs coverage tables reference the new tests — § 2 🟡, § 4 ✅, § 6 🟡

## Review

CI can only be checked after a push: push the repo (private is fine), make
sure `pnpm-workspace.yaml` is committed, and confirm the three CI jobs are
green. Flip to `done` when they are.

## Findings

- **Malformed issue files come back as ghosts.** gray-matter caches a file
  before parsing it; when the YAML throws, the first read skips the file but
  every later read returns the cached object with empty data — an issue titled
  with its filename, status `todo`. Filed as #0042. The fixture quotes its
  colon-containing title so the e2e counts are real.

## Out of scope

- Release automation — #0035
