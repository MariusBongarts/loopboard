---
id: 0104
title: Scaffold an index node with loopboard init --kind index
category: user-story
status: todo
assignee: agent
project: 04-harness-tree
phase: 1
parent: 0081
labels: [cli, setup, ids]
created: 2026-10-13
---

## User story

As a **maintainer adding an inner node to my tree**, I want
**`loopboard init --kind index` to write the identity file and an `INDEX.md`
stub, and the CLI to answer sensibly when it is pointed at such a node**, so
that **I don't write the files by hand and no command fails with "no issues
folder"**.

## Acceptance criteria

- [ ] `loopboard init --kind index [path]` writes `.agents/harness.md` (`kind: index`) and an `INDEX.md` stub in the folder, and nothing else — no workflow block, no `issues/`; `--id`, `--name`, `--parent` and the id rules work as for `--kind docs` (#0078)
- [ ] It never overwrites: an existing identity file or `INDEX.md` is kept, `--dry-run` only lists, and `--kind index` on a folder that holds a harness stops with a sentence
- [ ] `loopboard next-id` and creating an issue, from the CLI or the board, answer on an index node with one sentence saying that index nodes hold no issues
- [ ] `loopboard check` works in every node: it validates the node's identity file and follows its `parent` chain through the registry, reporting a cycle. On an index node that is all it does — it doesn't ask for an `issues/` folder
- [ ] A parent that isn't registered on this machine is printed as "parent not registered" and doesn't fail `--strict`
- [ ] Spec § 8 and § 10 gain the scenarios; Vitest on a temp folder outside git; `--help` and the README's CLI table name `--kind index`

## Out of scope

- Registering and opening an index node — #0081
- Checking the links inside `INDEX.md` — #0097 adds that to `check`
- Generating the content of `INDEX.md` — agents and people write it

## Notes

- PRD story 6. Split from #0081 in the review round.
- Also needs #0078, which adds `--kind` and the id rules to `init`.
- `--kind index` was an addition next to the decided `--kind docs`. The
  maintainer accepted it on 2026-10-13 (#0101, question 4): the flag keeps
  its name, and ADR-0007 has the mapping onto `kind` and `type`.
- `check` is per root today. The parent chain is the first thing it reads
  from the registry, so it has to work when there is none — a public repo's
  CI has no registry.
- Since #0078, `--kind index` stops with "--kind takes code or docs". The
  id rules and the identity file's writer are in `server/identity.ts`; the
  writer knows `kind: harness` only.
