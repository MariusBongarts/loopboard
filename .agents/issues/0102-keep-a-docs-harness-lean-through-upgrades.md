---
id: 0102
title: Keep a docs harness lean when it is upgraded
category: user-story
status: todo
assignee: agent
project: 04-harness-tree
phase: 1
parent: 0078
labels: [setup, skills, help]
created: 2026-10-13
---

## User story

As a **person with a docs harness in a cloud-synced folder**, I want **an
upgrade to bring new conventions without adding skills, symlinks or code
folders**, so that **the harness stays what `loopboard init --kind docs` set
up**.

## Acceptance criteria

- [ ] The upgrade-harness skill reads `type: docs` from `.agents/harness.md`. In a docs harness it offers and adds no skills, creates no links under `.claude/` or `.cursor/`, adds no code seed folders, and merges the docs variants of the workflow block, the READMEs and the templates — not the code ones
- [ ] Its report says "docs harness" and lists what it leaves out on purpose, so a missing skill doesn't read as a gap
- [ ] A docs harness has no upgrade-harness skill of its own: its workflow block names the upgrade prompt from Help → Upgrade as the way to upgrade, and that page's section "A repo without the skill" says it is also the way for a harness that has no skills by design
- [ ] The harness table in Help → Upgrade shows a docs harness with its migration level and marks it as a docs harness — never as "No AGENTS.md", and never behind for a skill it doesn't have
- [ ] The harness-status test gets a docs fixture (identity file, no skills, an older migration level)
- [ ] Spec § 8 and § 9 gain the scenarios

## Out of scope

- `init` and `init --upgrade` in a docs harness — #0078 keeps them lean
- Skills for docs harnesses, from a shared user-level folder or as copies — deferred in `wip.md`
- The migration that adds the identity file to existing harnesses — #0103

## Notes

- PRD story 13. `init --upgrade` only refreshes untouched files and never
  moves the migration level; migrations are applied by the upgrade-harness
  skill, read from the loopboard that is running. Its merge step today says
  "new upstream skill → add it, and link it" — in a docs harness all eight
  core skills are new, so the first upgrade would install skills and
  symlinks into a synced folder.
- Has to be done before the first migration reaches a docs harness. That is
  the identity migration in #0103: a docs harness already has the file, but
  its marker still has to move.
- Skill and Help wording is shipped text — no migration entry.
- Since #0078 the docs variants — the workflow block, the AGENTS.md
  skeleton, both READMEs and all five templates — are in `scaffold/docs/`.
  `init --upgrade` in a docs harness already refreshes from there.
