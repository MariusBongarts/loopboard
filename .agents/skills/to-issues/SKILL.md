---
name: to-issues
description: Break a plan, PRD, or spec into independently-grabbable issues at .agents/issues/ using vertical-slice (tracer-bullet) granularity. Use when the user wants to convert a plan into issues, create implementation tickets, or break work into atomic increments.
---

# To Issues

Break a plan into independently-grabbable issues at `.agents/issues/NNNN-slug.md`
using **vertical slices** (tracer bullets). Each slice cuts through every
integration layer end-to-end (schema, API, UI, tests) — never a horizontal
slice of one layer.

Conventions for issues, statuses, and categories live in
[`AGENTS.md`](../../../AGENTS.md). Read it first if anything below is unclear.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes
an issue or project reference (issue ID, project folder, or path) as an
argument, fetch and read it — including its PRD when it's a project.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current
state of the code. Issue titles and descriptions should use the project's
domain glossary at
[`.agents/specs/00-conventions-and-glossary.md`](../../specs/00-conventions-and-glossary.md),
and respect prior decisions in
[`.agents/architecture/decisions/`](../../architecture/decisions/).

### 3. Draft vertical slices

Break the plan into tracer-bullet issues. Each slice delivers a narrow but
COMPLETE path through every layer.

```text
Vertical slice rules:
- Each slice cuts through schema → API → UI → tests, end-to-end.
- A completed slice is demoable or verifiable on its own.
- Prefer many thin slices over a few thick ones.
- A slice that takes more than one session is too big — split it.
```

Choose the right `category:` per slice:

- **`user-story`** — slices that deliver a user-visible behavior change.
  Body: "As an X, I want Y, so that Z" → ACs → Out of scope.
- **`bug`** — slices that fix broken behavior.
  Body: Steps to reproduce → Current → Expected → ACs (verification) → Out of
  scope.
- **`task`** — slices with no direct user-visible delta (refactor, dep upgrade,
  infra, CI). Don't force these into user-story format.
  Body: What needs to change → Why → ACs → Out of scope.

Choose the right `status:` and `assignee:`:

- Most slices start at `status: todo` + `assignee: agent` (default —
  fully specified, ready for the agent to pick up).
- Set `status: backlog` (assignee still `agent`) when filing a slice
  that captures a future idea but isn't ready to schedule — it lands
  in loopboard's Backlog drawer instead of the active `Todo` column,
  so it doesn't dilute the maintainer's "what's next?" view. Promote
  to `todo` when the call to schedule is made. The slicing act itself
  IS usually the scheduling decision, so reach for `backlog` only when
  you're genuinely capturing speculation rather than work.
- Set `assignee: human` (status still `todo`) when the slice cannot be
  delegated to AI (judgment call, design review, manual UI testing,
  OAuth flows the agent can't drive). The body must explain *why* it's
  not delegable so the maintainer can act without re-deriving context.
- If genuine ambiguity remains and the user must clarify before the
  slice is actionable, set `assignee: human` and append a `## Questions`
  body section listing what's needed. Status stays `todo`.

Capture dependencies via `parent: NNNN` in frontmatter — point at the issue
that must complete first. The slice's status remains `todo` even if blocked;
the `parent` field signals the dependency to the [`triage`](../triage/SKILL.md)
skill.

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title** — short descriptive name
- **Category** — `user-story` / `bug` / `task`
- **Default status / assignee** — `todo` + `agent` | `human`
- **Parent** — which other slice (if any) must complete first
- **User stories covered** — which PRD user stories this addresses (when the
  source has them)

Ask the user:

- Does the granularity feel right? (Too coarse / too fine?)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the right slices marked `assignee: human` vs `assignee: agent`?

Iterate until the user approves.

### 5. Create the issue files

For each approved slice, create a new file at `.agents/issues/NNNN-slug.md` using
the per-category template:

- [`.agents/issues/_templates/user-story.md`](../../issues/_templates/user-story.md)
- [`.agents/issues/_templates/bug.md`](../../issues/_templates/bug.md)
- [`.agents/issues/_templates/task.md`](../../issues/_templates/task.md)

Numbering rules:

- Get the first ID with `npx loopboard next-id issue` once at the start of the
  batch, then increment locally. It counts the archive, other branches and
  other worktrees, so parallel agents don't collide. Without the CLI, use
  `max(existing) + 1` across `.agents/issues/` and `.agents/issues/_archive/`.
- The slug is kebab-case derived from the title.

Frontmatter to populate:

```yaml
---
id: NNNN
title: ...
category: user-story | bug | task
status: backlog | todo | blocked
assignee: agent | human
project: NN-slug         # set if the slice belongs to a project
phase: 1                 # set if the project's wip.md uses phase grouping
parent: NNNN             # set if blocked-by another issue
labels: []               # freeform — reuse existing labels where possible
source: github#N         # set when the slice comes from an external report
created: YYYY-MM-DD
---
```

**Create files in dependency order** (blockers first) so you can reference real
issue IDs in `parent:` fields without dangling links.

### 6. Update the project's wip.md

If the slices belong to a project, update the project's `wip.md`:

- Add a phase heading per logical grouping (or a single "Phase 1" if the
  breakdown is flat).
- List each new issue under its phase as a checkbox-prefixed reference:
  ` - [ ] [#NNNN Issue title](../../issues/NNNN-slug.md) — todo`.
- Update the "Current focus" paragraph to point at the first slice the user
  intends to start.

### 7. Hand off to the session loop

The user (or an AI agent) now picks the first `todo` issue, flips it to
`in-progress`, and starts work. The [`triage`](../triage/SKILL.md) skill helps
move issues through the state machine when needed.

---

_Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT, © 2026 Matt Pocock). See [CREDITS.md](../CREDITS.md)._
