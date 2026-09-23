# Issues

Issues live globally at `ai/issues/NNNN-slug.md` with a 4-digit zero-padded
running ID. A project's `wip.md` *references* issues by number — the project
does not own the issue files. This makes future migration to a real tracker
(GitHub Issues, Linear, etc.) a flat export. Closed issues move to
[`_archive/`](_archive/).

Each issue is a single SCRUM-style increment: small enough that an agent can
finish it in one session, large enough to be independently verifiable. Use
**vertical slices** (tracer bullets) that cut through every layer end-to-end,
not horizontal slices of one layer.

## File shape

YAML frontmatter for index fields, markdown body for the contract. The
frontmatter is identical across all categories; the body shape depends on
`category:`.

| Category | Template | Body shape |
|---|---|---|
| `user-story` | [`_templates/user-story.md`](_templates/user-story.md) | As/I want/so that → ACs → Out of scope |
| `bug` | [`_templates/bug.md`](_templates/bug.md) | Steps → Current → Expected → ACs → Out of scope |
| `task` | [`_templates/task.md`](_templates/task.md) | What → Why → ACs → Out of scope |

`task` covers refactors, dep upgrades, infra, and CI work that has no direct
user-visible delta. Don't force tasks into user-story format.

## Numbering

- **Issue IDs**: 4-digit running number, computed as `max(existing) + 1`
  across both `ai/issues/` and `ai/issues/_archive/`.
- **Slugs**: kebab-case, derived from the title.

## Status vocabulary

Canonical — every skill uses this. **Do not invent new statuses.**

### Pre-workflow state

| Status | Meaning |
|---|---|
| `backlog` | Captured idea, not yet scheduled. Lives in the tracker's Backlog drawer, not the kanban board. Promote to `todo` (or close as `wontfix`) when the call to schedule is made. |

`backlog` is a holding pen for future ideas that aren't ready to grab —
e.g. "voice editions" speculation, vendor-decision spikes, "someday"
items. Set it explicitly when filing an issue that you don't want
diluting the active `todo` column. The path out is always **`→ todo`**
(scheduled) or **`→ wontfix`** (rejected, with a "Why rejected"
section).

### Workflow states (linear progression)

| Status | Meaning |
|---|---|
| `todo` | Drafted, ready to be picked up. Default for new issues. |
| `in-progress` | Actively being worked on. |
| `in-review` | Implementation done; awaiting maintainer verification. |
| `done` | Verified and shipped. Eligible for `_archive/`. |

### Side states (any time)

| Status | Meaning |
|---|---|
| `blocked` | Waiting on another issue (`parent:`) or external dependency. |
| `wontfix` | Closed, not actioned. The body MUST include a "Why rejected" section before archiving — the archive is the institutional memory. |

## Assignee

Every issue carries an `assignee:` frontmatter field, orthogonal to status:

| Value | Meaning |
|---|---|
| `agent` (default) | The AI coding agent is driving. Implicit when the field is missing. |
| `human` | The maintainer is driving — clarification needed, manual UI testing, OAuth, design judgment, or production-credential access. The body should explain why (a `## Questions` section for clarification, or a body note for non-delegable work). |

Switch `assignee:` instead of moving `status:` backward when the agent hits
a question. For example: an agent halfway through an `in-progress` slice
that needs clarification leaves `status: in-progress`, flips
`assignee: human`, and adds a `## Questions` section to the body. The
maintainer answers, flips `assignee: agent` back, and the slice resumes.
This replaces the legacy `needs-info` and `ready-for-human` statuses.

## Priority (optional)

`priority: <integer ≥ 1>` is an optional sort rank within an issue's
column in the tracker board (1 = top, lower = higher priority). It is
**not** severity (P0/P1/P2). The tracker writes it when the maintainer
drags a card into a chosen vertical position; existing issues without
the field sort below prioritized ones, by id ascending.
