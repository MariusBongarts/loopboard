---
id: 0018
title: Fix duplicates with loopboard renumber
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 4
parent: 0017
labels: [cli, ids]
created: 2026-10-04
---

## User story

As a **developer with a duplicate number after a merge**, I want **`loopboard renumber <old> <new>` to rename the issue and rewrite every reference to it**, so that **cleanup is one command and no link breaks**.

## Acceptance criteria

- [x] Renames the file, updates the frontmatter `id:`, and rewrites `#old`, `parent: old` and wip.md links across `.agents/`
- [x] `--file <path>` picks which of two duplicates to move; without it the command refuses an ambiguous old number
- [x] `<new>` defaults to `next-id` when omitted
- [x] Works for projects (`NN-slug` folder, `project:` fields, links)
- [x] `--dry-run` prints the planned edits
- [x] Vitest covers issue and project renumbering with references in several files

## Out of scope

- Rewriting commit messages or PR titles that mention the old number

## Notes

- PRD story 23.

## Outcome

- `loopboard renumber <old> [new] [--file] [--dry-run]`, `--path` for another repo; twins need `--file` and their ambiguous `#NNNN` mentions are listed, not rewritten.
