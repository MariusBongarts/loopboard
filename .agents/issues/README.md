# Issues

Issues live globally at `.agents/issues/NNNN-slug.md` with a 4-digit zero-padded
running ID. A project's `wip.md` *references* issues by number — the project
does not own the issue files. This makes a future move to another tracker
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

## Source (optional)

`source: github#<number>` records where an issue came from when it was
accepted from an external report, e.g. a GitHub Issue on a public repo. It is
informational: loopboard ignores it, and the PR that resolves the issue
closes the GitHub issue (`Closes #<number>`). Omit it for issues filed
directly. Keep it unspaced — in YAML, ` #` starts a comment.

## Numbering

- **Issue IDs**: 4-digit running number. Get the next one with
  `npx loopboard next-id issue` — it looks at the archive, every branch and
  every worktree, so parallel agents don't pick the same number. Without the
  CLI, use `max(existing) + 1` across `.agents/issues/` and `_archive/`.
- **Slugs**: kebab-case, derived from the title.
- **Collisions**: `npx loopboard check --branches` finds duplicates;
  `npx loopboard renumber <old> [new]` moves one and fixes every reference.

## Status vocabulary

Canonical — every skill uses this. **Do not invent new statuses.**

### Pre-workflow state

| Status | Meaning |
|---|---|
| `backlog` | Captured idea, not yet scheduled. Lives in loopboard's Backlog drawer, not on the board. Promote to `todo` (or close as `wontfix`) when the call to schedule is made. |

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
| `in-review` | Implementation done, but it can't count as done until a human checks it (manual UI, OAuth, visual or product judgment). Always `assignee: human`, with a `## Review` section saying what to check. |
| `done` | Implemented and verified — by the agent (the repo's verify command passes, every acceptance criterion met) or by the maintainer. Eligible for `_archive/`. |

The default path is **`in-progress → done`**: the agent closes what it can
verify itself. `in-review` is the exception and always means "waiting on
you", so it never fills up silently. The
[`issue-grooming`](../skills/issue-grooming/SKILL.md) skill sweeps the board
against git and releases: it closes work that shipped while waiting, and asks
about stale, duplicate or outdated issues.

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

## Review and deploy markers (optional)

Two optional frontmatter dates record what happened *after* `done`:

| Field | Set by | Meaning |
|---|---|---|
| `reviewed: YYYY-MM-DD` | The maintainer only — agents never set it | A human looked at the result |
| `deployed: YYYY-MM-DD` | Whoever ships (a deploy step, skill or the maintainer) | The change is live |

They're markers, not statuses: an issue is `done` with or without them, and
review is a queue you work through when you choose. Omit them when unused.

## Priority (optional)

`priority: <integer ≥ 1>` is an optional sort rank within an issue's
column on loopboard's board (1 = top, lower = higher priority). It is
**not** severity (P0/P1/P2). loopboard writes it when the maintainer
drags a card into a chosen vertical position; existing issues without
the field sort below prioritized ones, by id ascending.

## Reserved fields and references

Reserved: loopboard reads the fields and references below from a later
release. Until then it leaves the fields alone and shows the references as
plain text, so what you write today stays valid. All four fields are
optional.

| Field | Meaning | Example |
|---|---|---|
| `due` | The day the issue has to be finished. | `due: 2026-11-30` |
| `waiting-on` | Who owes a reply: a person or an organisation, or a list of them. Quoted, because YAML doesn't let a plain value start with `@`. | `waiting-on: "@accountant"` |
| `blocked-by` | Every issue or project that must finish first: a list on one line, a local issue as bare digits (` #` would start a comment). `parent:` stays the single local blocker. | `blocked-by: [0029, shop#0412]` |
| `recurrence` | Which recurring duty and period the issue stands for. `loopboard recur` writes it; never set it by hand. | — |

| Reference | Points at | Example |
|---|---|---|
| `<id>#NNNN` | An issue in another harness. | `shop#0412` |
| `<id>#PNN` | A project in another harness, by its number. | `shop#P04` |
| `<id>:<path>` | A file in another harness, relative to that harness's folder. A space in the path is written `%20`. | `company:contracts/lease.pdf` |
| `@id` | A person or an organisation. loopboard leaves it as plain text; a tool that keeps people as files can resolve it. | `@accountant` |

`<id>` is the id a harness carries in its `.agents/harness.md`: lowercase
letters, digits and hyphens, 2 to 32 characters, starting with a letter and
ending with a letter or digit — and never one of `http`, `https`, `mailto`,
`file`, `ftp`, `tel`, `github`, `true`, `false`, `null`, `yes`, `no`, `on`,
`off` or `workspace`. A plain `#NNNN` always means an issue in this harness.
