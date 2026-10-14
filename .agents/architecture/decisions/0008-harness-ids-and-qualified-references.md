# Harness ids are short lowercase words, and references carry them in front

- **Status**: accepted — `init --kind docs` checks ids (#0078); not built yet: #0079 (ids), #0082 (references); the note on `@id` amended by [ADR-0009](0009-views-over-a-tree-live-outside-loopboard.md)
- **Date**: 2026-10-13

Every harness counts its issues from 0001, so a reference into another
harness has to say which one. It does so with the harness id from the
identity file ([ADR-0007](0007-identity-file-in-the-harness.md)): a word
people type and read, that ends up in the files of other harnesses and never
changes. Its shape and the reference syntax are fixed here, before the first
id is written — a pattern that is tightened later would invalidate ids and
references that are already on disk.

## Ids

An id matches `^[a-z][a-z0-9-]{0,30}[a-z0-9]$` and is not a reserved word:
lowercase ASCII letters, digits and hyphens; it starts with a letter and
ends with a letter or digit; 2 to 32 characters.

| Reserved | Because |
|---|---|
| `http`, `https`, `mailto`, `file`, `ftp`, `tel` | URL schemes — `https://…` has the shape of a file reference |
| `github` | `source: github#1234`, a shipped convention, has the shape of an issue reference |
| `true`, `false`, `null`, `yes`, `no`, `on`, `off` | YAML keywords — loopboard's own reader converts the first three, stricter readers the other four |
| `workspace` | what a workspace id falls back to when a folder's name leaves no slug |

Starting with a letter keeps YAML from reading an id as a number or a date.
The minimum of two characters keeps a Windows drive letter (`C:\…`) from
reading as a file reference. An **alias** (`aliases:` in the identity file)
follows the same pattern and the same reserved words and resolves like the
id; the ids and aliases of the registered nodes share one namespace.

## References

| Form | Example | Points at |
|---|---|---|
| `<id>#NNNN` | `shop#0412` | issue 0412 in the harness `shop` |
| `<id>#PNN` | `shop#P04` | project 04 in `shop`, by its number |
| `<id>:<path>` | `company:contracts/lease.pdf` | a file in `company`, relative to the harness's folder — the one that holds `.agents/` |

- An alias stands wherever the id does: with `aliases: [co]`, `co#0031` is
  `company#0031`.
- An unqualified `#NNNN` stays local to the harness it is written in. There
  is no unqualified project form.
- A path ends at the next whitespace, and trailing punctuation doesn't
  belong to it. A space in a path is written `%20`.
- The two `#` forms count for every word that is a valid id, registered or
  not. `<word>:<path>` counts only when the word is a registered id or
  alias — prose is full of `word:word`.
- The `source:` line of an issue is never scanned for references.
- In a frontmatter list a local issue is written as bare digits, because a
  `#` after a space starts a YAML comment, and the list is flow-style on one
  line: `blocked-by: [0029, shop#0412]`. loopboard reads such a line raw —
  its YAML reader would turn `0042` into the number 34 (#0059).

## Considered options

- **UUIDs or random ids** — unique without a rule, but an id is typed and
  read in references.
- **Any folder slug as an id** — no folder would need an explicit `--id`,
  but `2026-taxes` starts like a number, a single letter reads as a drive,
  and `file` or `on` as something else. Loosening the pattern later costs
  nothing; tightening it breaks ids on disk.
- **Skipping the `source:` line without reserving `github`** — keeps the
  field out, but `github#1234` in a sentence would still name a harness.

## Consequences

- A folder whose slug breaks the pattern needs an explicit id
  (`init --id`): one that starts with a digit (`2026-taxes`), is a single
  character or longer than 32, is a reserved word, or fell back to
  `workspace`.
- The list of reserved words is closed. A word added later could invalidate
  an id that exists, so it takes a new ADR.
- A file reference depends on the machine: where the harness isn't
  registered — a public repo's CI — `company:contracts/lease.pdf` is plain
  text. A `#` reference to an id nobody registered is reported as not
  registered, not as an error (#0082).
- Existing harnesses have nothing to do: no matcher takes a `#NNNN` that
  directly follows a letter or digit for a local issue (#0100).
- #0082 pins the remaining cases in its table of what is and isn't a
  reference — which trailing characters are punctuation, and how a path
  that needs one of them is written.
- `@id` names a person or an organisation, not a harness. Objects have their
  own ids, and since [ADR-0009](0009-views-over-a-tree-live-outside-loopboard.md)
  loopboard doesn't resolve them: `@id` stays plain text on the board. This
  ADR doesn't cover them.
