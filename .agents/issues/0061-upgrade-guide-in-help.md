---
id: 0061
title: Put the upgrade guide and its prompts in the Help Center
category: user-story
status: done
assignee: agent
project: 03-help-center
phase: 1
parent: 0060
labels: [ui, help, server]
created: 2026-10-05
---

## User story

As a **maintainer**, I want the upgrade prompts in the Help Center, each with
a copy button and filled in with the path of the loopboard I'm running, so
that I don't have to find them in the README and edit a placeholder.

## Acceptance criteria

- [x] The full upgrade prompt lives in `docs/upgrade-prompt.md`; the README quotes it verbatim and a unit test fails if either README prompt drifts from its doc
- [x] `/help/upgrade` shows the short request ("upgrade my loopboard harness") and the full prompt, each copyable
- [x] The full prompt names the running package's path instead of `<path-to-loopboard>`
- [x] The page explains `npx loopboard init --upgrade` and its `--force` / `--dry-run` flags, and what the skill does that the CLI doesn't
- [x] e2e: copying the full prompt puts the doc text with the real path on the clipboard

## Out of scope

- Per-repo harness levels (#0062)

## Notes

- PRD stories 9–11. The path comes from `GET /api/harness` (#0062 adds the workspace part).
