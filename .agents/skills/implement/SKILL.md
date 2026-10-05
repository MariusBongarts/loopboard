---
name: implement
description: Drive a single issue through the AGENTS.md Session loop — pick → in-progress → implement vertical slice → verify → done (or in-review for a human check) → update specs. Use when the user says "implement #NNNN", "work on the next todo", "pick up an issue", or wants to execute a ticket end-to-end.
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
- Read the issue file at `.agents/issues/NNNN-*.md` (frontmatter + body).
- If the issue has a `project:` field, read that project's `wip.md`
  for context.
- Use the [`triage`](../triage/SKILL.md) skill to flip
  `status: todo → in-progress`.

### 2. Implement (vertical slice)
- Cut end-to-end through every layer, not one layer.
- Reuse existing helpers / composables — apply DRY rigorously
  (per AGENTS.md general rules).
- Follow coding standards in [AGENTS.md](../../../AGENTS.md) and any
  specific rules its triggers point to (components, UI/UX).
- If blocked on human input: use [`triage`](../triage/SKILL.md) to flip
  `assignee: human` and append a `## Questions` section. Do **not**
  move `status` backward.

### 3. Verify
- Run the repo's verify command (AGENTS.md › Build & test). Non-negotiable.
- For UI/frontend changes, manually exercise the feature in a
  browser before declaring complete.
- Fix failures before proceeding to phase 4.

### 4. Close & log session
- If verify passed and every acceptance criterion is met (tick them
  in the body), use [`triage`](../triage/SKILL.md) to flip
  `status: in-progress → done`.
- If a criterion needs a check you can't do yourself — manual UI judgment,
  OAuth, production access, a product call — flip to `in-review`, set
  `assignee: human`, and add a `## Review` section listing exactly what to
  check. Never park an issue in `in-review` just because a human *could*
  look at it.
- Never set `reviewed:` — that date belongs to the maintainer.
- If the issue belongs to a project, append a session entry to that
  project's `wip.md` activity log and refresh "Current focus".

### 5. Update specs (if user-facing)
- If you touched user-visible behavior, update the relevant spec
  indexed in [`.agents/specs/_specs.md`](../../specs/_specs.md).
  Required by AGENTS.md.

### 6. Hand off
- Stop. Report what landed, what you verified, and anything left in
  `## Review`. The maintainer reviews `done` work when they choose.
