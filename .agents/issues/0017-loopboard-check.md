---
id: 0017
title: Flag duplicate IDs and dangling references with loopboard check
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 4
parent: 0016
labels: [cli, ids, ci]
created: 2026-10-04
---

## User story

As a **developer**, I want **`loopboard check` to fail on duplicate issue/project IDs and report dangling `parent:` and `#NNNN` references**, so that **collisions that slip past the allocator are caught before merge**.

## Acceptance criteria

- [x] Duplicate IDs in the working tree (including archive) fail with exit code 1 and name the files
- [x] `--branches` also compares against local and remote-tracking branches and names the branch that holds the twin
- [x] Dangling `parent:` and `#NNNN` references are warnings (exit 0) unless `--strict`
- [x] Each problem prints the fix command (e.g. `loopboard renumber 0091 0094`)
- [x] This repo's `pnpm verify` and CI run it; `SETUP.md` suggests adding it to the adopter's verify
- [x] Vitest covers each case

## Out of scope

- Fixing problems automatically — #0018

## Notes

- PRD story 22.

## Outcome

- `loopboard check [--branches] [--strict]`; this repo's verify runs it through a Vitest test (`this repo has no duplicate issue or project numbers`), so CI does too. SETUP.md suggests it for adopters.
