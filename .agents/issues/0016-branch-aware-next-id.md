---
id: 0016
title: Allocate branch-aware IDs with loopboard next-id
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 4
parent: 0007
labels: [cli, ids]
created: 2026-10-04
---

## User story

As a **developer running agents in parallel worktrees**, I want **new issue and project numbers to take every branch and worktree on my machine into account**, so that **merges don't produce two #0091s**.

## Acceptance criteria

- [x] `loopboard next-id issue|project [path]` prints the next number: max across the working tree, `_archive/`, every worktree's working copy, every local branch and the remote-tracking refs, plus one
- [x] Outside a git repo it falls back to a folder scan
- [x] Output is zero-padded (4 digits for issues, 2 for projects) and machine-readable
- [x] to-issues, to-prd and the issues/projects READMEs tell agents to call `next-id` instead of computing max+1
- [x] Vitest with temp git repos: unmerged branch, second worktree, archive-only max, no git

## Out of scope

- Random/non-sequential IDs — rejected in the PRD
- Duplicate detection — #0017

## Notes

- PRD story 21. A batch of N issues can call it once and increment locally, as the skills do today.

## Outcome

- `server/ids.ts`; real-path normalization needed on macOS (git reports `/private/var`). Skills to-issues/to-prd and both READMEs now call `npx loopboard next-id`.
