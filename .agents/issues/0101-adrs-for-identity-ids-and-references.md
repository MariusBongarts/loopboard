---
id: 0101
title: Record the identity file, the id pattern and the reference syntax in ADRs
category: task
status: todo
assignee: human
project: 04-harness-tree
phase: 1
labels: [docs, conventions, ids]
created: 2026-10-13
---

## What needs to change

The contract of project 04 is decided in outline: an identity file per
harness, descriptive ids, three reference forms. Its details are not — how
exactly an id may look, which words it can never be, where a path reference
ends — and the PRD marks them as assumed. Write them down as two ADRs, and
document the reserved fields and reference forms where agents in every
harness read them.

No code changes.

## Why

An id "never changes", and `loopboard init --kind docs` (#0078) writes ids
into identity files before a tree of harnesses exists. A pattern that is
tightened later would invalidate ids and references that are already on
disk. One collision exists today: `source: github#1234`, a shipped
convention, has exactly the shape of a reference to issue 1234 in a harness
called `github`.

## Questions

Assigned to the maintainer: each answer becomes part of the on-disk format.
Every question has the answer the PRD and the issues assume — "as proposed"
is a complete reply.

1. **Id pattern.** Proposal: lowercase ASCII letters, digits and hyphens;
   starts with a letter, ends with a letter or digit; 2 to 32 characters. A
   folder whose slug starts with a digit (`2026-taxes`) then needs an
   explicit `--id`. Starting with a letter keeps YAML from reading an id as
   a number or a date.
2. **Reserved words** that can never be an id or an alias. Proposal: URL
   schemes (`http`, `https`, `mailto`, `file`, `ftp`, `tel`), `github`, the
   YAML keywords (`true`, `false`, `null`, which loopboard's own YAML reader
   converts, and `yes`, `no`, `on`, `off`, which stricter readers convert)
   and `workspace` (what an empty slug falls back to). Single letters are
   out through the minimum length, which also keeps Windows drive letters
   from reading as file references.
3. **File references.** Proposal: `<id>:<path>` ends at the next whitespace,
   a space in a path is written `%20`, and trailing punctuation doesn't
   belong to the path. `<word>:<path>` counts as a reference only when the
   word is a registered id or alias. The `source:` line of an issue is never
   scanned for references.
4. **`--kind` on `init` versus `kind:` in the file.** `init --kind docs` is
   decided, while the file's `kind` is `harness` or `index` and `docs` is a
   `type`. Proposal: the flag names the scaffold (`code`, `docs`, `index`)
   and maps onto the two fields; `--kind index` is an addition (#0104).
   Rename the flag if the double meaning bothers you.
5. **A shared repository's identity file.** In a git repository that others
   clone, `id`, `name`, `parent` and `aliases` are public. Proposal: the
   file holds the project's id and name and a parent that is true for
   everyone, or `null`; a personal name or parent lives in the per-user
   registry as an override (ADR-0002: personal state never lives in the
   repo). The alternative is a documented caveat and no override.
6. **Worktrees and second clones.** Every checkout of a repo carries the
   same committed id. Proposal: the first one registered is the harness;
   another one opens as a secondary checkout of the same id and is never the
   target of a reference (#0080).

## Acceptance criteria

- [ ] An ADR records that a harness carries its identity in `.agents/harness.md`: why in the harness and not only in the registry (it amends ADR-0002 and revisits the per-repo file ADR-0003 turned down), the fields, that the file always sits in `.agents/` — also next to a legacy `ai/` root, with root detection unchanged — what a shared repository's file holds, where a personal name or parent lives, and how a worktree or second clone opens
- [ ] A second ADR records ids and references: the exact id pattern with its minimum and maximum length, the reserved words, the three qualified forms, aliases, unqualified `#NNNN` staying local, where a path ends and how a space is written, when `<word>:<path>` counts, that the `source:` line is never scanned, and that frontmatter lists write a local issue as bare digits, flow-style on one line
- [ ] The issues README gains a short "Reserved fields and references" section — `due`, the quoted `waiting-on`, `blocked-by`, `recurrence`, the three reference forms and `@id`, one line and one example each — marked as reserved: loopboard reads them from a later release
- [ ] The PRD's contract section says what was decided: every "assumed" that these questions cover is removed or replaced, and #0078, #0079, #0080 and #0082 are updated where an answer differs from the proposal
- [ ] `loopboard check` passes and the scaffold tests still pass — the README is shipped text

## Out of scope

- Any parser, reader or CLI change — #0078, #0079, #0082
- The ADR for registering a folder tree — #0095
- Where "since", recurring duties and a log file live — #0088, #0090, #0109

## Notes

- This issue is first in phase 1 and blocks #0078, #0079 and #0082: they
  cite the ADRs instead of repeating the rules.
- Once the questions are answered, flip the issue to `assignee: agent`; the
  rest is writing.
- README wording is shipped text, not a workflow change — no migration
  entry. The docs variant of the README gets the same section in #0078.
