---
id: 0059
title: "Parent ids made of digits 0–7 point at the wrong issue"
category: bug
status: done
assignee: agent
labels: [data]
created: 2026-10-05
---

## Steps to reproduce

1. Give an issue `parent: 0016` (unquoted) in its frontmatter.
2. Open it on the board.

## Current behavior

The card's "waiting on" marker is missing and the issue view shows the
relation as `#0014`. js-yaml (YAML 1.1) reads an unquoted `0016` as octal 14,
so every parent whose digits are all 0–7 is wrong — in this repo #0036 pointed
at #0029 instead of #0035. Found while recording the README demo (#0036).

## Expected behavior

`parent:` is the four-digit id written in the file, quoted or not.

## Acceptance criteria (verification)

- [x] Reproduction steps no longer reproduce the bug
- [x] Regression test added at the right seam (or absence of seam documented)
- [x] No `[DEBUG-...]` instrumentation left behind

## Out of scope

- `id:` — already taken from the filename for the same reason.

## Notes

- Fixed by reading `parent` from the raw frontmatter line (`readField`), not
  the parsed YAML. Vitest: `tests/issues.test.ts` "parent ids".
