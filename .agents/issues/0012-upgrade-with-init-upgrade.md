---
id: 0012
title: Refresh skills and templates with loopboard init --upgrade
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 3
parent: 0011
labels: [cli, setup]
created: 2026-10-04
---

## User story

As a **developer on an older setup**, I want **`loopboard init --upgrade` to refresh skills, templates, READMEs and the AGENTS.md block, and to warn instead of overwriting files I customized**, so that **I get improvements without losing my edits or my work**.

## Acceptance criteria

- [x] `init` records a manifest of shipped file hashes; `--upgrade` compares against it
- [x] Unmodified shipped files are updated; locally edited ones are skipped with a warning unless `--force`, pointing to the upgrade-harness skill (#0041), which merges customized files and runs pending migrations
- [x] Issue files, project folders and spec/architecture content are never touched
- [x] Only the content between the AGENTS.md markers is replaced
- [x] Prints a summary (updated / skipped / new); `--dry-run` changes nothing
- [x] Vitest covers unmodified, modified and `--force` cases

## Out of scope

- Migrating repos from `ai/` to `.agents/` — detection keeps legacy roots working

## Notes

- PRD stories 15, 16.

## Outcome

- Same planner as init (`upgrade: true`): manifest-hash check, `--force`, `--dry-run`, block text refreshed with the harness's migration level preserved.
