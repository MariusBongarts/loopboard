---
id: 0002
title: Move workflow conventions from ai/ to .agents/ and drop the lorem examples
category: task
status: done
assignee: agent
project: 01-open-source-launch
phase: 1
labels: [oss, conventions]
created: 2026-10-04
---

## What needs to change

- Move the issues and projects READMEs and `_templates/` from `ai/` into
  `.agents/issues/` and `.agents/projects/`, next to this project's files.
- Delete the lorem/ipsum projects, the dummy issues 0064–0069
  (its history lives in webhighlights), then remove `ai/`.
- Replace every `ai/` path in the skills, READMEs, templates and AGENTS.md with
  `.agents/`.
- Rewrite AGENTS.md for this repo: loopboard project overview, drop the
  Firebase trigger, and only link files that exist (or are created by #0005).
- Make `.agents` the tracker's default root, so `pnpm dev` shows this project.

## Why

The PRD makes `.agents/` the default root and this repo the live example. The
lorem data and monorepo leftovers are the first thing a visitor would see.

## Acceptance criteria

- [x] No `ai/` folder remains; `grep -r "ai/" .agents AGENTS.md` finds no stale paths — remaining hits are this project's own mentions of the legacy `ai/` root
- [x] `pnpm dev` (no env vars) shows project 01 and its issues
- [x] Issues and projects READMEs/templates live under `.agents/` and describe `.agents/` paths
- [x] AGENTS.md has no Firebase rule and no links to missing files — the specs, architecture and rules links resolve once #0005 lands
- [x] `pnpm verify` passes

## Out of scope

- Root auto-detection (`.agents/` → `ai/`) — #0007
- Specs, architecture and rules content — #0005

## Notes

- Test fixtures that model an `ai/` root stay; they now stand for legacy repos.
