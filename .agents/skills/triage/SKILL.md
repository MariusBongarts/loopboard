---
name: triage
description: Move issues through the SCRUM-style status state machine and assignee field. Use when the user wants to triage the backlog, move an issue to a new status, assign an issue to a human, or close an issue as wontfix.
---

# Triage

Operate on `ai/issues/*.md` files (and `ai/issues/_archive/*.md` for closed
ones). Mutate frontmatter `status:`, `assignee:`, and `parent:` fields,
append body sections where the workflow requires (e.g. "Why rejected" on
`wontfix`, `## Questions` on `assignee: human`), and move files between
`ai/issues/` and `ai/issues/_archive/` when issues close.

The canonical status vocabulary, assignee field, categories, and field shape
live in [`ai/issues/README.md`](../../../ai/issues/README.md). Read it first
if anything below is unclear.

## State machine

```text
   backlog ─► todo ─► in-progress ─► in-review ─► done ─► (archive)
      ▲       │                                     │
      └───────┘ (deferred / promoted)                │
      └──────► wontfix ◄──────────────────────────────┘
                                                     │
              todo ─► blocked ─► (cleared when parent: is done)

              ┌─ Orthogonal: every issue carries `assignee: agent | human` ──┐
              │ The agent flips `assignee: human` (status stays put) when    │
              │ it can't proceed alone. Maintainer answers, flips back.      │
              └──────────────────────────────────────────────────────────────┘
```

Status semantics (lifecycle only):

- `backlog` — captured idea, not yet scheduled. Lives in the tracker's
  Backlog drawer, not on the kanban board. Promote to `todo` when ready
  to schedule, or close as `wontfix` if the idea is rejected.
- `todo` — drafted, ready to be picked up.
- `in-progress` — actively being worked on.
- `in-review` — implementation done; awaiting maintainer verification.
- `done` — verified shipped. Eligible for `_archive/`.
- `blocked` — waiting on the issue named in `parent:`. Watch for the parent
  flipping to `done` and clear the block.
- `wontfix` — closed, not actioned. The body MUST get a "Why rejected" section
  before archiving.

Assignee semantics (orthogonal — who is currently driving):

- `agent` (default) — the AI coding agent is driving.
- `human` — the maintainer is driving. Reasons: clarification needed
  (body gets a `## Questions` section), or the work is not delegable to AI
  (manual UI, OAuth, design judgment, production credentials — body
  explains why).

Status never moves backward to express "I need input". Flip `assignee:`
instead.

## Invocation

The maintainer typically invokes this skill in natural language:

- "Triage the backlog" → show what needs attention.
- "Assign #0042 to human" → quick assignee flip.
- "Close #0042 as wontfix because X" → wontfix + archive.
- "Promote #0052 to todo" → flip `status: backlog → todo` (scheduled).
- "Send #0042 to backlog" → flip `status: todo → backlog` (deferred).
- "What's ready for an agent to pick up?" → list `todo` + `assignee: agent`
  issues, oldest first.
- "What's on my plate?" → list `assignee: human` issues, oldest first.
- "What's in the backlog?" → list `status: backlog` issues, oldest first.

Interpret the request and act. Confirm before any destructive action (close,
move to archive, override an in-progress flow).

## Show what needs attention

Query `ai/issues/*.md` and present two buckets, oldest first by `created:`:

1. **`assignee: human`** — the maintainer's plate. Group by reason: issues
   with a `## Questions` section (clarification owed) versus issues that
   are non-delegable by design (manual UI, OAuth, etc.).
2. **`blocked`** — list each with its `parent:` issue and the parent's current
   status, so the maintainer can spot blockers ready to clear.

Show counts and a one-line summary per issue. Let the maintainer pick.

`todo` + `assignee: agent` and `in-progress` issues are *not* surfaced as
"needs attention" — they are the normal agent pipeline. Neither is
`backlog` — those are deliberately deferred ideas, not items pending a
decision. Surface them only when the maintainer explicitly asks
("what's in the backlog?").

## Backlog promotion / demotion

Backlog is a holding pen, not a workflow stage. Three transitions
matter:

- **`backlog → todo`** (promote) — the idea is now ready to schedule.
  Pure status flip; no body changes.
- **`todo → backlog`** (demote / send to backlog) — a `todo` issue
  turns out to be premature. Pure status flip; no body changes. Use
  this instead of `wontfix` when the idea might still happen later.
- **`backlog → wontfix`** — the idea is rejected. Same as any other
  `→ wontfix` transition: append a `## Why rejected` section before
  archiving.

Backlog issues never go directly to `in-progress` — promote to `todo`
first so the lifecycle stays linear from `todo` onwards.

## Triage a specific issue

1. **Gather context.** Read the full issue (frontmatter, body, comments). If
   the issue has a `project:` field, read the project's `wip.md` for context.
   Use the project's domain glossary at
   [`ai/specs/00-conventions-and-glossary.md`](../../../ai/specs/00-conventions-and-glossary.md)
   so triage notes match the rest of the repo's vocabulary. Check
   [`ai/architecture/decisions/`](../../../ai/architecture/decisions/) for
   prior decisions in the area you're touching. Scan
   [`ai/issues/_archive/`](../../../ai/issues/_archive/) for prior `wontfix`
   issues that resemble this one — their "Why rejected" sections are the
   institutional memory.

2. **Recommend.** Tell the maintainer your status recommendation with
   reasoning, plus a brief codebase summary relevant to the issue. Wait for
   direction.

3. **Reproduce (bugs only).** Before any grilling, attempt reproduction: read
   the reporter's steps, trace the relevant code, run tests or commands. Use
   the [`diagnose`](../diagnose/SKILL.md) skill for hard reproduction work.
   Report what happened — successful repro with code path, failed repro, or
   insufficient detail (a strong `assignee: human` signal — flip it,
   add a `## Questions` body section, and surface specific gaps).

4. **Grill (if needed).** If the issue needs fleshing out, run a
   [`grill-me`](../grill-me/SKILL.md) or
   [`grill-with-docs`](../grill-with-docs/SKILL.md) session.

5. **Apply the outcome.** Update the issue's frontmatter `status:` and/or
   `assignee:` fields and any related fields (`parent:`, `project:`,
   `phase:`). For close transitions, move the file to `ai/issues/_archive/`.

   - **`assignee: human`** — flip when work needs human input. If the cause
     is missing clarification, append a `## Questions` body section
     (template below). If the cause is non-delegable work (manual UI,
     OAuth, production credentials, design judgment), update the body to
     note *why* it can't be delegated. Status stays put.
   - **`assignee: agent`** — flip back when the maintainer's input has
     been captured in the body and the slice is ready to resume. Don't
     erase the `## Questions` section — its answers are institutional
     memory.
   - **`wontfix`** — append a "Why rejected" body section, then move the
     file to `ai/issues/_archive/`. The archive folder is the institutional
     memory for rejected ideas.
   - **`blocked`** — set `parent: NNNN` to the blocking issue.
   - **`done`** — verified shipped. Move to `ai/issues/_archive/` once the
     associated project's wip.md activity log records the close.

## Quick state override

If the maintainer says "assign #0042 to human" or "move #0042 to blocked",
trust them and apply the change directly. Confirm what you're about to do
(field change, body edit, file move), then act. Skip grilling.

## Questions template (for `assignee: human`)

Append to the issue body, below the existing sections, when flipping
`assignee: human` because clarification is needed:

```markdown
## Questions (YYYY-MM-DD)

**What we've established so far:**

- point 1
- point 2

**What we still need from you (@reporter or @maintainer):**

- specific question 1
- specific question 2
```

Capture everything resolved during grilling under "established so far" so the
work isn't lost. Questions must be specific and actionable, not "please
provide more info". Once the maintainer answers (in the body or chat), flip
`assignee: agent` back; leave the section in place as institutional memory.

## Why rejected template (for `wontfix`)

Append to the issue body before archiving:

```markdown
## Why rejected (YYYY-MM-DD)

Concept: <short kebab-case name, e.g. dark-mode, multi-tenant>

This will not be actioned because:

- Substantive reason 1 (project scope, technical constraint, strategic choice)
- Substantive reason 2

**Related issues:** (links to prior issues that requested the same concept)

**Reconsider if:** (concrete trigger that would warrant revisiting)
```

The `Concept` field is a kebab-case label so future triage sessions can grep
the archive (`rg "Concept: dark-mode" ai/issues/_archive/`) and surface the
prior rejection when a similar issue arrives. This replaces the dedicated
`.out-of-scope/` directory pattern from external skill libraries — the
archive is the memory.

## Resuming a previous session

If a prior `## Questions` section exists on the issue, read it, check
whether the reporter has answered any outstanding questions in the body
or chat, and present an updated picture before continuing. Don't re-ask
resolved questions.
