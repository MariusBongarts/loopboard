---
id: 0122
title: Scaffold routines, add the routine skill and the AGENTS rule, migrate with M003
category: user-story
status: todo
assignee: agent
project: 05-routines
phase: 3
parent: 0116
labels: [conventions, skills, workflow]
created: 2026-10-27
---

## User story

As a **maintainer**, I want **every harness to come with `.agents/scheduled/`,
a skill that writes routines and a rule that sends recurring work there**, so
that **an agent asked to "remind me on Friday" writes a routine instead of a
task of its platform — in new harnesses and, after an upgrade, in old ones**.

## Acceptance criteria

- [ ] `.agents/scheduled/README.md` and `scheduled/_templates/routine.md` exist in a code version (this repo's, shipped) and a docs version (`scaffold/docs/`); `loopboard init` creates them, `init --upgrade` adds them, and the manifest tracks them
- [ ] Skill `routine` ships as a core skill: create, change, pause and show a routine; schedule in words → cron and back; asks for steps, `expires-after` and `writes-to`; copies the template, sets `created`; runs `loopboard check`; never creates a platform task
- [ ] The code AGENTS block gains the rule with the skill, the docs block with the folder's README; this repo's managed block stays identical to `scaffold/AGENTS.block.md`
- [ ] `MIGRATIONS.md` M003 names the folder, the skill, the rule, the reworded issues README, and — confirm first — moving the harness's platform tasks into routines; this repo's marker moves to M003
- [ ] Spec § 8 and § 15 gain the scenarios; Vitest covers init, upgrade and the docs scaffold

## Out of scope

- Moving the maintainer's existing platform tasks (later sessions)

## Notes

- PRD "Agents and setup", stories 28–30.
