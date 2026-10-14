# Views over a tree of harnesses live outside loopboard

- **Status**: accepted — amends [ADR-0007](0007-identity-file-in-the-harness.md) and [ADR-0008](0008-harness-ids-and-qualified-references.md); closes #0081, #0087, #0089, #0092, #0093, #0094, #0098, #0104, #0106, #0109
- **Date**: 2026-10-14

Project 04 set out to make loopboard "one board for code, companies and
private life": index nodes that group harnesses, people and organisations as
files with pages and backlinks, an Overview of the whole tree, the switcher
as a tree, a Home tab per harness and a log of what was done where. Most of
that serves personal organisation, not a board for issues — and every piece
of it would have to be generic, documented and supported in a public tool.
The maintainer decided on 2026-10-14 to keep loopboard a board per harness,
for code and for documents, and to leave views over a whole tree to tools
built on the same files.

## Decision

**loopboard keeps** what a person with several repositories and document
folders needs on the board itself: the identity file (`id`, `name`,
`parent`, `aliases`, `type`), harnesses that move or are reached through a
symlink or a worktree, docs harnesses, qualified references between
harnesses and `check` for them, `where` and `resolve`, due dates — also
across workspaces on the existing cross-workspace page — `waiting-on`,
`blocked-by` across harnesses, recurring issues, ⌘K across workspaces,
registering a folder tree, and opening linked documents.

**loopboard leaves out:**

- **Index nodes.** A folder whose identity file says `kind: index` is not a
  workspace: it is never registered, a tree scan lists it as skipped, and
  `init --kind index` is not offered. The value stays valid in the file, for
  other tools.
- **People and organisations.** The `objects:` field is kept and ignored.
  `@id` stays plain text in bodies, and a `waiting-on` value is shown as
  written.
- **Views over the tree.** No Overview page of the tree, no tree in the
  switcher, no Home tab, no list of connections between harnesses, no log
  at the top of the tree. `parent` is stored, validated and returned by the
  API and `where --json`; loopboard draws no tree with it.

**What loopboard offers such tools:** the files and their contract (ADR-0007,
ADR-0008 and the issues README's reserved fields), `loopboard workspaces
--json`, `where` and `resolve` (#0083), and stable URLs to a workspace, an
issue and a project (#0113), so a tool can link into the board instead of
copying it.

## Considered options

- **Build it all into loopboard** (project 04 as planned) — one tool, but
  a person's page, a log and a tree overview are opinions about how one
  organises a life, and each needs a public, generic form before anyone can
  use it.
- **A plugin interface** — too early: no second consumer exists to shape it.
  The files are the interface for now.

## Consequences

- ADR-0007: the `kind` row keeps `index` as a valid value, read by other
  tools; loopboard registers only `kind: harness`. The `--kind index` row is
  gone, and `init` keeps stopping in a folder whose file says `kind: index`.
  `objects` is a field loopboard keeps and ignores. Root detection
  ([ADR-0003](0003-dot-agents-root-with-detection.md)) is unchanged: the
  identity file is not a second way in, so a harness needs its `issues/`
  folder as before.
- ADR-0008: `@id` stays reserved syntax that loopboard doesn't resolve.
- Project 04's PRD keeps the stories it moved out, marked as such, so their
  numbers stay valid in the issues that cite them.
- The reserved fields and the reference forms don't change, so files
  written for either side stay valid.
