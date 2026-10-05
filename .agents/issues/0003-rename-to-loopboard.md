---
id: 0003
title: Rename the tracker to loopboard and remove personal setup
category: task
status: done
assignee: agent
project: 01-open-source-launch
phase: 1
parent: 0002
labels: [oss]
created: 2026-10-04
---

## What needs to change

- Package name `loopboard`; remove `private: true`; add description,
  repository, keywords and `engines` (Node ≥ 20).
- Remove the personal `dev:wh`, `dev:mm`, `dev:pa`, `dev:alive`, `dev:mb`,
  `dev:wh2` and `dev:dir` scripts (workspaces replace them in #0008).
- Rename the UI brand, the page `<title>` and the server log prefix to loopboard.
- Strip the README of monorepo leftovers (`tools/tracker`, `pnpm tracker:*`,
  the `06-issue-tracker` PRD link) so it stays accurate until #0013 rewrites it.

## Why

A private package with the maintainer's sibling-repo paths can't be published
or understood by anyone else.

## Acceptance criteria

- [x] `package.json` has no personal scripts or sibling-repo paths
- [x] The app shows "loopboard" in the rail and the browser tab
- [x] README contains no references to files outside this repo
- [x] `pnpm verify` passes
- [x] `pnpm dev` takes the next free port when 5180 is busy (added by the maintainer during implementation)

## Deviations

- `private: true` stays until #0035 adds the `files` allowlist and the
  publish pipeline, so an accidental `pnpm publish` can't ship the whole repo.
- `repository`/`homepage` wait for #0001 to decide the GitHub home.
- Browser storage keys keep their `tracker.*` prefix so remembered pins, rail
  width and selection survive; #0008 re-keys them per workspace anyway.

## Out of scope

- The `bin` entry and CLI — #0007
- The full README rewrite — #0013
