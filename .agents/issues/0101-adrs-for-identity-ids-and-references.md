---
id: 0101
title: Record the identity file, the id pattern and the reference syntax in ADRs
category: task
status: in-progress
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

Three are left, assigned to the maintainer. The first two become part of
the on-disk format. Both have the answer the PRD and the issues assume — "as
proposed" is a complete reply — and
[ADR-0007](../architecture/decisions/0007-identity-file-in-the-harness.md)
records that answer as **assumed**. They keep their numbers, because #0079,
#0080 and the WIP cite them. The third came out of the review of #0078 and
carries its number from the WIP.

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

10. **A migration entry for the reserved fields.** This issue added `due`,
    `waiting-on`, `blocked-by` and `recurrence` to the shipped issues README
    and wrote no entry in `MIGRATIONS.md`. AGENTS.md names frontmatter
    fields as a reason for one, and both existing migrations list optional
    fields (M001 `source:`, M002 `reviewed:` and `deployed:`). Reserving a
    name also asks something of a harness that already uses it for
    something else. Proposal, as the WIP assumes (its question 10): no
    entry — the fields are optional and need nothing from an existing
    harness, and the README section reaches it through upgrade-harness. The
    alternative is an entry now, with the step "rename your own fields
    called `due`, `waiting-on`, `blocked-by` or `recurrence`", and both
    blocks' markers moved to it.

Neither of the first two touches #0078: a docs harness is not a shared
repository and has no worktrees. The first and the fourth criterion stay open until both are
answered; everything in them that doesn't hang on these two questions is
written.

## Answered (2026-10-13)

The maintainer accepted the proposals to questions 1–4 as written (in the
WIP they are questions 2–4). They are decided and recorded in
[ADR-0008](../architecture/decisions/0008-harness-ids-and-qualified-references.md)
and, for the flag, in ADR-0007.

1. **Id pattern.** Lowercase ASCII letters, digits and hyphens; starts with
   a letter, ends with a letter or digit; 2 to 32 characters —
   `^[a-z][a-z0-9-]{0,30}[a-z0-9]$`. A folder whose slug starts with a digit
   (`2026-taxes`) needs an explicit `--id`.
2. **Reserved words** that can never be an id or an alias: `http`, `https`,
   `mailto`, `file`, `ftp`, `tel`, `github`, `true`, `false`, `null`, `yes`,
   `no`, `on`, `off` and `workspace`.
3. **File references.** `<id>:<path>` ends at the next whitespace, a space
   in a path is written `%20`, and trailing punctuation doesn't belong to
   the path. `<word>:<path>` counts as a reference only when the word is a
   registered id or alias. The `source:` line of an issue is never scanned.
4. **`--kind` on `init`.** The flag keeps its name and names the scaffold:
   `code` (`kind: harness`, `type: code`), `docs` (`kind: harness`,
   `type: docs`) and `index` (`kind: index`, no `type`).

The WIP's short form of these questions leaves out two clauses of the
proposals above — an id ends with a letter or digit, and trailing
punctuation doesn't belong to a path. Both are in ADR-0008; say so if either
was not meant.

## Acceptance criteria

- [ ] An ADR records that a harness carries its identity in `.agents/harness.md`: why in the harness and not only in the registry (it amends ADR-0002 and revisits the per-repo file ADR-0003 turned down), the fields, that the file always sits in `.agents/` — also next to a legacy `ai/` root, with root detection unchanged — what a shared repository's file holds, where a personal name or parent lives, and how a worktree or second clone opens
- [x] A second ADR records ids and references: the exact id pattern with its minimum and maximum length, the reserved words, the three qualified forms, aliases, unqualified `#NNNN` staying local, where a path ends and how a space is written, when `<word>:<path>` counts, that the `source:` line is never scanned, and that frontmatter lists write a local issue as bare digits, flow-style on one line
- [x] The issues README gains a short "Reserved fields and references" section — `due`, the quoted `waiting-on`, `blocked-by`, `recurrence`, the three reference forms and `@id`, one line and one example each — marked as reserved: loopboard reads them from a later release
- [ ] The PRD's contract section says what was decided: every "assumed" that these questions cover is removed or replaced, and #0078, #0079, #0080 and #0082 are updated where an answer differs from the proposal
- [x] `loopboard check` passes and the scaffold tests still pass — the README is shipped text

## Out of scope

- Any parser, reader or CLI change — #0078, #0079, #0082
- The ADR for registering a folder tree — #0095
- Where "since", recurring duties and a log file live — #0088, #0090, #0109

## Notes

- This issue is first in phase 1. #0078 and #0082 cite the ADRs instead of
  repeating the rules, and everything they cite is decided. #0079 and #0080
  build on the assumed answers to questions 5 and 6.
- Once those two are answered, flip the issue to `assignee: agent`. What is
  left is writing: the "Still assumed" section of ADR-0007, the two lines
  the PRD still marks as assumed, and #0079 or #0080 where an answer differs
  from the proposal.
- Written so far: ADR-0007 with everything but those two points decided,
  ADR-0008, the README section, the glossary's identity file, harness id,
  reserved word and qualified reference, and the PRD's contract section for
  questions 1–4. No answer differed from its proposal, so #0078 and #0082
  keep their criteria.
- `recurrence` has no example value in the README: what the field holds is
  question 2 in #0090, and `loopboard recur` writes it.
- README wording is shipped text, not a workflow change — no migration
  entry. The docs variant of the README gets the same section in #0078.
  Whether reserving four field names is only wording is question 10 above.
- Review of #0078: the README section now lists the reserved words next to
  the id pattern — in a docs harness it is the only place the rule is
  written. ADR-0007 records what `init` reads of the file, that a harness
  without `type` is a code harness, and both ways to write `aliases`.
