# A harness carries its identity in `.agents/harness.md`

- **Status**: accepted, except the two points under "Still assumed" (#0101, questions 5 and 6) — `init --kind docs` writes the file (#0078); not built yet: #0079, #0080, #0103
- **Date**: 2026-10-13

A workspace's id and name live only in the per-user registry
([ADR-0002](0002-workspace-registry-in-user-config.md)), and the id is the
slug of the folder's name. A moved or renamed folder therefore comes back as
a new workspace next to a "folder missing" one, two folders called `taxes`
can't be told apart, and nothing can point from one harness into another.
Every harness and every index node now carries its identity in a file of its
own, `.agents/harness.md`: YAML frontmatter and one paragraph saying what
the node is for. Once loopboard has read the file it wins over the registry,
which becomes a map from id to path and remembers the last values it read.

| Field | Value |
|---|---|
| `schema` | integer; the version of this format, `1` for now |
| `id` | the harness id — pattern and reserved words in [ADR-0008](0008-harness-ids-and-qualified-references.md); unique among the registered nodes; never changes |
| `name` | display name; any characters, quoted where YAML needs it |
| `kind` | `harness` (has a board) or `index` (groups other nodes, has no `issues/`) |
| `parent` | the id of another node, or `null` for a top node |
| `created` | `YYYY-MM-DD` |
| `aliases` | optional; a list of short ids that resolve like `id` |
| `type` | optional; `code` or `docs` |
| `objects` | optional; the path of an objects folder, relative to the node's folder |

Any other field is kept and ignored. `id`, `parent` and `aliases` are read
from the raw line, not through YAML, so a value keeps the text it has.

The file always sits at `.agents/harness.md` in the node's folder — also in
a legacy harness whose issues live under `ai/`, and in an index node, which
has no issue root at all. Root detection
([ADR-0003](0003-dot-agents-root-with-detection.md)) keeps its order,
`.agents/issues` then `ai/issues`; the file is a second way in only for a
node that has neither, and never wins over an existing root.

`loopboard init --kind` names the scaffold, not the field, and maps onto
`kind` and `type`:

| `--kind` | `kind:` | `type:` | Scaffold |
|---|---|---|---|
| `code` (default) | `harness` | `code` | today's, plus the identity file (#0103) |
| `docs` | `harness` | `docs` | issues and projects, no specs, skills or symlinks (#0078) |
| `index` | `index` | not written | the identity file and an `INDEX.md` (#0104) |

## Still assumed

Questions 5 and 6 in #0101 are open. #0079 and #0080 build on the answers
below until the maintainer decides otherwise.

- **A shared repository's file.** In a git repository that others clone the
  file is committed, so `id`, `name`, `parent` and `aliases` reach every
  clone. **Assumed:** the file holds the project's id and name and a parent
  that is true for everyone, or `null`; a personal name or parent lives in
  the per-user registry as an override that wins over the file and is never
  written into the harness. The alternative is a documented caveat and no
  override.
- **Worktrees and second clones.** A plain copy of a registered harness,
  with both folders present, is refused. A git worktree or a second clone is
  not a copy: the file is committed, so every checkout carries the same id.
  **Assumed:** the first one registered is the harness; another one opens as
  a secondary checkout of the same id under a machine-local key and is never
  the target of a reference.

## Considered options

- **Identity only in the registry** (ADR-0002 as written) — nothing to keep
  in the harness, but an id that lives outside the folder can't survive a
  move, differs from machine to machine and can't be written into a
  reference.
- **A JSON file** — the file watcher and the document store only handle
  markdown, the frontmatter reader exists, and a person can read a
  paragraph.

## Consequences

- This amends ADR-0002: a workspace's id and name come from the harness, and
  a harness that was identified once never falls back to its folder's slug,
  not even while the file is missing or unreadable. Unchanged: loopboard
  discovers nothing on its own, and per-workspace UI state and saved views
  stay in the user config.
- It revisits what ADR-0003 turned down, "a per-repo config file … one more
  file every adopter keeps". This file doesn't name the root. It is one more
  file per harness, accepted because an id outside the harness can't survive
  a move; `init` and one migration (#0103) write it, so nobody keeps it by
  hand.
- A harness without the file behaves as before: its id is its folder's slug.
- Today's code ignores the file, so one written by hand is valid before
  loopboard reads it.
