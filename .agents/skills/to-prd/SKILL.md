---
name: to-prd
description: Turn the current conversation context into a PRD and create a new project folder for it. Use when the user wants to formalize a plan, draft a PRD, or kick off a new project from the current discussion.
---

# To PRD

Take the current conversation context and codebase understanding and produce a
PRD inside a new project folder. **Do NOT interview the user** — synthesize
what you already know. Use the [`grill-me`](../grill-me/SKILL.md) or
[`grill-with-docs`](../grill-with-docs/SKILL.md) skills *before* this one if
fuzzy points need resolving.

Conventions for projects, PRDs, and the surrounding workflow live in
[`AGENTS.md`](../../../AGENTS.md). Read it first if anything below is unclear.

## Process

### 1. Explore

Explore the repo to understand the current state of the codebase, if you haven't
already. Use the project's domain glossary at
[`.agents/specs/00-conventions-and-glossary.md`](../../specs/00-conventions-and-glossary.md)
so PRD terminology matches the rest of the repo. Respect any prior decisions in
[`.agents/architecture/decisions/`](../../architecture/decisions/) — don't
re-litigate decided ground.

### 2. Sketch the modules

Sketch the major modules you will need to build or modify. Actively look for
opportunities to extract **deep modules** that can be tested in isolation.

> A deep module encapsulates a lot of functionality behind a simple, testable
> interface that rarely changes. Shallow modules have interfaces nearly as
> complex as their implementation.

Check with the user that the module shape matches their expectations. Confirm
which modules they want tests written for (see
[`tdd/SKILL.md`](../tdd/SKILL.md) for the testing methodology this repo uses).

### 3. Pick the project number and slug

Get the project ID from `npx loopboard next-id project` (it counts every
branch and worktree); without the CLI, take the next 2-digit number after the
highest existing `.agents/projects/NN-...` folder. The slug is kebab-case derived from the project
title. Example: `03-builder-tone-and-length`.

### 4. Create the project folder

Create `.agents/projects/NN-slug/` with two files seeded from the templates:

- `prd.md` — copied from
  [`.agents/projects/_templates/prd.md`](../../projects/_templates/prd.md),
  filled with synthesized content from the conversation.
- `wip.md` — copied from
  [`.agents/projects/_templates/wip.md`](../../projects/_templates/wip.md),
  with `Last updated`, the project title in the heading, and an initial
  `Activity log` entry recording the kickoff.

### 5. Fill the PRD

Write the PRD using the template. Keep these in mind:

- **Problem statement** and **Solution** are written from the affected actor's
  perspective. No implementation language.
- **User stories** is a long, numbered list. Each story will become a candidate
  vertical slice for the [`to-issues`](../to-issues/SKILL.md) skill — don't be
  stingy.
- **Implementation decisions** describe interfaces, contracts, schema shapes,
  integration points. **Do NOT include file paths or code snippets** — they go
  stale fast.
- **Testing decisions** captures what makes a good test for this project (only
  external behavior, not implementation details), which modules to test, and
  prior art (similar tests already in the codebase).
- **Out of scope** explicitly lists adjacent things that will NOT ship. Each
  entry should explain *why* — future readers and `grill-with-docs` sessions
  shouldn't have to re-litigate.

### 6. Hand off to to-issues

Once the PRD is committed, suggest running
[`to-issues`](../to-issues/SKILL.md) to break it into vertical-slice issues
under `.agents/issues/`. The PRD's User stories list is the natural starting point
for that breakdown.

---

_Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT, © 2026 Matt Pocock). See [CREDITS.md](../CREDITS.md)._
