---
id: 0030
title: Show git activity on an issue
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 7
parent: 0007
labels: [ui, git]
created: 2026-10-04
---

## User story

As a **developer**, I want **an issue to list the commits and branches that mention it and the history of its file**, so that **I know what the agent actually did without leaving loopboard**.

## Acceptance criteria

- [x] The drawer shows commits whose message mentions `#NNNN` (subject, short hash, date, branch) and local branches whose name contains the number
- [x] A history section lists commits touching the issue file, with status changes derived from the frontmatter diff
- [x] Repos without git, or with git missing, hide the section without errors
- [x] Results are computed on demand per issue and cached until the next file change
- [x] Vitest with a temp git repo

## Out of scope

- GitHub/GitLab API (PR status, CI) — local git only

## Notes

- PRD story 39.

## Outcome

- `server/activity.ts` (git log `--follow` with per-version status, `--grep` for mentions, branch names), cached on HEAD + file mtime; `server/git.ts` now shared with the ID allocator. Drawer "History" loads on open.
