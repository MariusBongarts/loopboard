---
id: 0079
title: Take a harness's id, name and parent from its identity file
category: user-story
status: todo
assignee: agent
project: 04-harness-tree
phase: 1
parent: 0101
labels: [server, workspaces, conventions]
created: 2026-10-13
---

## User story

As a **maintainer of several harnesses**, I want **loopboard to take a
harness's id, name, kind and parent from `.agents/harness.md`**, so that **a
harness is the same harness wherever its folder sits, two folders with the
same name can be told apart, and harnesses can form a tree**.

## Acceptance criteria

- [ ] One module reads and validates the identity file — `schema`, `id`, `name`, `kind`, `parent`, `created`, and the optional `aliases`, `type`, `objects` — as the PRD and the ADRs from #0101 define them. `id`, `parent` and `aliases` are read from the raw line, so a value like `true`, `null` or `2026` stays the text it is; unknown fields are ignored and survive every write loopboard makes to the file
- [ ] The file is looked for at `.agents/harness.md` in the node's folder, also when the issue root is a legacy `ai/`; root detection is unchanged
- [ ] Registering a folder with a valid file uses its `id` as the workspace id and its `name` as the display name; `kind`, `type`, `parent` and `aliases` come back with the workspace from the API. The file is read at registration and again on every load of the workspace
- [ ] A folder that never had a valid identity file registers under its slug id and works as today
- [ ] Once the registry has taken an id from the file, a missing, unreadable or invalid file keeps the last known id, name, kind and parent, which the registry remembers — it never falls back to the slug. A sync client's conflict copy of `harness.md` is ignored
- [ ] Each of those problems — an invalid id, an unknown `kind`, an unreadable file, a conflict copy — is printed by `loopboard check` with the file and the reason, and listed in the board's skipped-files list from #0071
- [ ] Two registered nodes can't share an id or an alias: the second registration is refused with a sentence naming both folders — no silent `-2` suffix
- [ ] The registry can hold a per-machine name and parent for a node; where set, they win over the file for display and for the tree and are never written into the harness. Renaming a workspace in the board writes that override when the harness is a git repository, and the file's `name:` line otherwise; `loopboard workspaces set <id> --parent <id|none>` writes the parent override
- [ ] The glossary gains harness id, index node and top node; spec § 7 is updated, "Rename and remove workspaces" included; Vitest covers a valid file, no file, an invalid id, a duplicate id, unknown fields kept, an unreadable file on a harness that was already identified, and the legacy `ai/` fixture with an identity file

## Out of scope

- Writing the file for code harnesses, the migration for existing ones and this repo's own file — #0103
- Following a harness that moved, treating a symlinked path as the same folder, and worktrees — #0080
- Index nodes, which have no `issues/` folder — #0081
- Showing the tree anywhere — the Overview and the switcher come in phase 3; here `parent` is only stored and returned
- Resolving `objects:` — phase 2

## Notes

- PRD stories 1, 4, 5. A harness whose id equals its folder slug keeps its
  URL, saved views and per-workspace browser state: they are keyed by the
  same id as before.
- The per-machine override is the answer #0101 proposes for its question 5,
  and it is what lets a public repo hang under a private node without
  publishing that node's id. If the maintainer picks the caveat instead,
  drop that criterion: renaming then always writes the file. The `set`
  subcommand extends `loopboard workspaces` from #0099.
- Until #0080 lands, a second checkout of a harness that has an identity
  file is refused as a duplicate id. Only docs harnesses carry the file at
  that point, and they have no worktrees; this repo gets its file in #0103,
  after #0080.
- Markdown with frontmatter, not JSON: the watcher only reacts to markdown
  and the document store only serves markdown under the root.
- A file with a higher `schema` than loopboard knows is read as far as it is
  understood, with a warning; it must never fail a request.
- Dates in YAML arrive as `Date` objects; normalise `created` the way issue
  dates are normalised.
- Since #0078, `server/identity.ts` holds the id pattern, the reserved
  words, the file's writer and a raw-line reader for `id`, `name`, `kind`,
  `type`, `parent` and `aliases`; `init` is its only caller. A docs harness
  set up with an `--id` other than its folder's slug is registered under the
  slug until this issue reads the file.
- The reader takes a file with a BOM or blank lines before the frontmatter,
  a quoted name with ` #` in it, and `aliases` on one line or one per line.
  `init` checks the registry only: two folders with the same name that are
  set up before either is opened both carry that id, and this issue is where
  the second registration is refused. `samePath` in `server/workspaces.ts`
  tells one folder reached through two paths; `init` uses it, the registry
  doesn't until #0080.
