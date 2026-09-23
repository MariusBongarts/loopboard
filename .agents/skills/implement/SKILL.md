---
name: implement
description: Drive a single issue through the AGENTS.md Session loop — pick → in-progress → implement vertical slice → verify → in-review → update specs. Use when the user says "implement #NNNN", "work on the next todo", "pick up an issue", or wants to execute a ticket end-to-end.
---

# Implement

Drive one issue through the implementation lifecycle defined in
[AGENTS.md](../../../AGENTS.md) "Session loop". Phases are mandatory and
ordered — do not skip or reorder.

## Invocation

- "Implement #0042" → grab that issue.
- "Work on the next todo" / "pick up an issue" → read the active
  project's `wip.md` "Current focus", list candidate `todo` +
  `assignee: agent` issues oldest-first, ask which to grab.

## Phases

### 1. Pick & flip in-progress
- Read the issue file at `ai/issues/NNNN-*.md` (frontmatter + body).
- If the issue has a `project:` field, read that project's `wip.md`
  for context.
- Use the [`triage`](../triage/SKILL.md) skill to flip
  `status: todo → in-progress`.

### 2. Implement (vertical slice)
- Cut end-to-end through every layer, not one layer.
- Reuse existing helpers / composables — apply DRY rigorously
  (per AGENTS.md general rules).
- Follow coding standards in [AGENTS.md](../../../AGENTS.md) and any
  specific rules its triggers point to (Firebase, components, UI/UX).
- If blocked on human input: use [`triage`](../triage/SKILL.md) to flip
  `assignee: human` and append a `## Questions` section. Do **not**
  move `status` backward.

### 3. Verify
- Run `pnpm verify`. Non-negotiable.
- For UI/frontend changes, manually exercise the feature in a
  browser before declaring complete.
- Fix failures before proceeding to phase 4.

### 4. Flip in-review & log session
- Use [`triage`](../triage/SKILL.md) to flip
  `status: in-progress → in-review`.
- If the issue belongs to a project, append a session entry to that
  project's `wip.md` activity log and refresh "Current focus".

### 5. Update specs (if user-facing)
- If you touched user-visible behavior, update the relevant spec
  indexed in [`ai/specs/_specs.md`](../../../ai/specs/_specs.md).
  Required by AGENTS.md.

### 6. Hand off
- Stop. The maintainer verifies and flips to `done`. Do not self-flip.
