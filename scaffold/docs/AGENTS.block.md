<!-- loopboard:start — managed by `loopboard init` / upgrade-harness; edit outside these markers -->
<!-- loopboard:migration {{MIGRATION}} -->
## Workflow

Issues and projects live in `.agents/` as markdown; `loopboard` shows them on
a board. Commands here read `loopboard …`; `npx loopboard …` works once the
package is published. [`.agents/harness.md`](.agents/harness.md) says what
this folder is: its id, its name and what it is for.

**Project vs. issue.** Open a **project** at `.agents/projects/NN-slug/` when
work has several decisions to lock up-front (it gets a PRD). A single task →
a standalone issue in `.agents/issues/`.

**Conventions live next to the work — load only when needed:**

- [`.agents/projects/README.md`](.agents/projects/README.md) — project
  structure (`prd.md` + `wip.md`), kickoff, ship gate, numbering.
- [`.agents/issues/README.md`](.agents/issues/README.md) — issue file shape,
  category templates, statuses, assignee, numbering.

**Session loop**

1. Read `wip.md` "Current focus" → pick a `todo` issue → flip to
   `in-progress`. Outside a project, pick a `todo` standalone issue.
2. Do what the issue describes, from start to finish, and tick each
   acceptance criterion as it is met.
3. An issue is `done` when every acceptance criterion is ticked and the
   evidence is written in the issue: a file path, a reference, the date
   something was sent. If it needs something only a human can do or check (a
   signature, a payment, a phone call, a judgment), flip to `in-review` +
   `assignee: human` with a `## Review` section. Append a session entry to
   `wip.md` either way.
4. The maintainer reviews when they choose (optional `reviewed:` date).
   Finished issues move to `.agents/issues/_archive/`.
<!-- loopboard:end -->
