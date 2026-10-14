# Issues

Issues live at `.agents/issues/NNNN-slug.md` with a 4-digit zero-padded
running ID. A project's `wip.md` *references* issues by number — the project
does not own the issue files. Closed issues move to [`_archive/`](_archive/).

Each issue is one step that can be finished and checked on its own: small
enough for one session, large enough that its result can be shown — a
document written, a form sent, a decision recorded.

## File shape

YAML frontmatter for index fields, markdown body for the contract. The
frontmatter is identical across all categories; the body shape depends on
`category:`.

| Category | Template | Body shape |
|---|---|---|
| `task` | [`_templates/task.md`](_templates/task.md) | What → Why → ACs → Out of scope |
| `user-story` | [`_templates/user-story.md`](_templates/user-story.md) | As/I want/so that → ACs → Out of scope |
| `bug` | [`_templates/bug.md`](_templates/bug.md) | What is wrong → How it should be → ACs → Out of scope |

`task` fits most work here. Use `user-story` when it matters who the result
is for, and `bug` when something that was finished turns out to be wrong — a
wrong figure in a filing, a missing attachment.

## Evidence

An acceptance criterion is ticked together with its evidence, written next to
it or under `## Notes`: the path of the file that was produced, a reference
number, the date something was sent and to whom. Paths are relative to this
folder — the one that holds `.agents/` — so they stay valid when the folder
moves.

## Numbering

- **Issue IDs**: 4-digit running number. Get the next one with
  `loopboard next-id issue` — it counts the archive too. Without the CLI, use
  `max(existing) + 1` across `.agents/issues/` and `_archive/`.
- **Slugs**: kebab-case, derived from the title; lowercase letters, digits
  and dashes only.
- **Collisions**: two devices that share this folder can hand out the same
  number. `loopboard check` finds duplicates and files the board can't show;
  `loopboard renumber <old> [new]` moves one and fixes every reference.

## Status vocabulary

Canonical. **Do not invent new statuses.**

### Pre-workflow state

| Status | Meaning |
|---|---|
| `backlog` | Captured idea, not yet scheduled. Lives in loopboard's Backlog drawer, not on the board. Promote to `todo` (or close as `wontfix`) when the call to schedule is made. |

`backlog` is a holding pen for "someday" items that aren't ready to grab. Set
it explicitly when filing an issue that you don't want diluting the active
`todo` column. The path out is always **`→ todo`** (scheduled) or
**`→ wontfix`** (rejected, with a "Why rejected" section).

### Workflow states (linear progression)

| Status | Meaning |
|---|---|
| `todo` | Drafted, ready to be picked up. Default for new issues. |
| `in-progress` | Actively being worked on. |
| `in-review` | The agent's part is finished, but it can't count as done until a human does or checks something (a signature, a payment, a phone call, a judgment). Always `assignee: human`, with a `## Review` section saying what to check. |
| `done` | Finished: every acceptance criterion is ticked and the evidence is written in the issue. Eligible for `_archive/`. |

The default path is **`in-progress → done`**: the agent closes what it can
show evidence for. `in-review` is the exception and always means "waiting on
you", so it never fills up silently.

### Side states (any time)

| Status | Meaning |
|---|---|
| `blocked` | Waiting on another issue (`parent:`) or on someone outside. |
| `wontfix` | Closed, not actioned. The body MUST include a "Why rejected" section before archiving — the archive is the memory of what was decided. |

## Assignee

Every issue carries an `assignee:` frontmatter field, orthogonal to status:

| Value | Meaning |
|---|---|
| `agent` (default) | The AI agent is driving. Implicit when the field is missing. |
| `human` | The maintainer is driving — a question to answer, a signature, a payment, a call, a decision. The body should explain why (a `## Questions` section for clarification, or a note for work that can't be delegated). |

Switch `assignee:` instead of moving `status:` backward when the agent hits
a question: it leaves `status: in-progress`, flips `assignee: human` and adds
a `## Questions` section to the body. The maintainer answers, flips
`assignee: agent` back, and the work resumes.

## Review marker (optional)

`reviewed: YYYY-MM-DD` records that a human looked at the result after
`done`. The maintainer sets it — agents never do. It is a marker, not a
status: an issue is `done` with or without it.

## Priority (optional)

`priority: <integer ≥ 1>` is an optional sort rank within an issue's
column on loopboard's board (1 = top, lower = higher priority). It is
**not** urgency. loopboard writes it when the maintainer drags a card into a
chosen vertical position; issues without the field sort below prioritized
ones, by id ascending.

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
