---
id: 0087
title: Keep people and organisations as files every harness can reach
category: user-story
status: wontfix
assignee: agent
project: 04-harness-tree
phase: 2
parent: 0081
labels: [server, cli, data, conventions]
created: 2026-10-13
---

## Why rejected

Moved out of loopboard on 2026-10-14
([ADR-0009](../architecture/decisions/0009-views-over-a-tree-live-outside-loopboard.md)).
People and organisations as files — like every view over a whole tree of harnesses — belong to a
tool built on the same files, not to the board. loopboard stays a board per
harness, for code and for documents, and keeps those files readable for
such tools: the identity file, the reserved fields, `workspaces --json` and
stable URLs (#0113). The text below stays as the record of what was
planned.

## User story

As a **maintainer who deals with the same people in several harnesses — the
accountant in the company's and in the private taxes workspace**, I want **a
person or an organisation to be one markdown file with notes that every
harness of my tree, and every agent working in one, can find**, so that
**what we know about someone is a memory in one place instead of being
scattered over issues**.

## Acceptance criteria

- [ ] Object files — markdown with frontmatter `type: person` or `type: organisation`, `id`, `name`, and on a person an optional `org: "@id"` — are read from the folder the tree's top node names in `objects:`, however that folder is organised below; the type comes from the frontmatter, never from a folder name
- [ ] A harness finds its objects by following `parent` up to the top node; a harness whose top node isn't registered, or names no objects folder, simply has none. An `objects:` value that resolves outside the node's own folder — `..`, an absolute path, a symlink leading out — is refused and reported by `loopboard check`
- [ ] A markdown file without `type` is ignored. One with a `type` but an invalid or missing `id`, and one that can't be read, never fail a request: the objects API returns them as `skipped` with file and reason, and `loopboard check` prints the same list
- [ ] People and organisations share one id namespace; `loopboard check` reports a duplicate id with both files, and an `org` that points at no organisation
- [ ] `loopboard resolve @<id>` prints the object file's absolute path from any harness of the tree; `--json` adds type, name and org. `loopboard where <id> --json` includes the absolute path of the tree's objects folder, so an agent knows where a new person's file goes
- [ ] The issues README shipped by both scaffolds gains a "People and organisations" section: the shape of the file, how to find the folder, the quoted `"@id"` form in frontmatter, and the rule for agents — read the file before contacting someone, append what you learned afterwards
- [ ] The glossary gains object, person and organisation; `docs/folder-map.md` and Help → Reference, where #0103 documents the identity file, show the objects folder and one person file
- [ ] Vitest covers the reader on a temp tree whose top node is an index node, and `resolve @<id>` from a harness two levels below it; spec § 10 gains the scenario

## Out of scope

- The list and the pages in the board — #0106
- `waiting-on` — #0088
- Linking `@id` mentions and showing backlinks on the page — #0089
- More types, custom types and relations between objects beyond `org`
- Creating or editing object files from the board — agents and your editor write them; deferred in `wip.md`
- Importing contacts from anywhere

## Notes

- PRD stories 28, 33, 34. A person's file is a memory across topics,
  private and business: what an agent reads before writing to someone and
  appends to afterwards. That only works if an agent in any harness can get
  from `@id` to the file — hence `resolve` and the README section.
- The parent is #0081 because the top node of the PRD's example tree is an
  index node. Also needs #0083, which adds `resolve` and `where`.
- The objects folder usually sits outside `.agents/`, where the file watcher
  doesn't look; whatever shows objects refetches on open and on window focus.
- Folder names are the user's business (`people/`, `organisations/`, or the
  same in any other language); don't rely on them and don't create them.
- On a synced folder, files can be briefly unreadable — same rule as #0071:
  skip and report.
- README wording is shipped text — no migration entry.
