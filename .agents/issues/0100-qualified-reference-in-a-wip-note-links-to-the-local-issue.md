---
id: 0100
title: A qualified reference in a WIP note links to the local issue with the same number
category: bug
status: done
assignee: agent
labels: [ui, ids]
created: 2026-10-13
---

## Steps to reproduce

1. In a workspace that has an issue 0003, open a project's `wip.md` and write
   `shop#0003` — meaning issue 0003 of another harness — into "Current
   focus", or into the first bullet of a dated entry in the activity log.
2. Write `shop#0003` on a line under a `### Phase` heading of the same WIP.
3. Open the project in the board.

## Current behavior

- The current focus and the session note show `shop` as plain text followed
  by a button `#0003` that opens the **local** issue 0003. A pinned note does
  the same.
- The local issue 0003 is counted as a member of that phase, so the phase's
  progress and its issue list are wrong.

Four places match `#NNNN`. Two of them — `loopboard check` and the linkifier
of issue bodies — skip a number that directly follows a letter or digit. The
other two — the one that splits note text into issue buttons, and the one
that collects a phase's issues from the WIP — match any `#` followed by four
digits.

## Expected behavior

`#NNNN` directly after a letter or digit is not a local reference, anywhere.
`shop#0003` stays plain text until qualified references become links
(#0084), and it never counts towards a phase.

## Acceptance criteria (verification)

- [x] The note text and the phase parser no longer treat `shop#0003` as issue 0003; an unqualified `#0003` works in both as before
- [x] All four matchers share one pattern from `shared/`, so they can't drift apart again
- [x] Regression tests pin, for the note segments and for the phase parser: `shop#0003`, `#0003`, `(#0003)`, `#0003.` and a number inside an issue-file link
- [x] Spec § 2, "The feed lists sessions and issues by day", says that a number directly after a letter or digit is not a reference

## Out of scope

- Turning qualified references into links — #0084
- The shared reference parser and `check` for qualified references — #0082
- Linking plain `#NNNN` in PRD and WIP documents — #0084

## Notes

- Found in the review of project 04. Every harness counts from 0001, so this
  happens as soon as someone writes a reference to another harness by hand —
  which the project's contract allows from day one. Fix it before a tree of
  harnesses is created.
- Until then, keep qualified references out of WIP notes and phase lists.
- Landed: [`shared/refs.ts`](../../shared/refs.ts) holds the pattern.
  `renumber` builds its per-number matcher from it as well, so five places
  share it. All of them now also skip a number after `&`, as the linkifier of
  issue bodies did; `check` no longer reports an entity like `&#8212;`.
- Checked in a browser against a copy of the e2e fixture: the focus popover,
  the activity note and the pinned note keep `shop#0003` as text and still
  link `#0003`, and the phase bar counts only the local issue. No Playwright
  test was added; the coverage row in spec § 2 names the unit tests.
