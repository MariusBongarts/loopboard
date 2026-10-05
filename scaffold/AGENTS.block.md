<!-- loopboard:start — managed by `loopboard init` / upgrade-harness; edit outside these markers -->
<!-- loopboard:migration {{MIGRATION}} -->
## Workflow

Issues, PRDs and specs live in `.agents/` as markdown; `npx loopboard` shows
them on a board.

**Project vs. issue.** Open a **project** at `.agents/projects/NN-slug/` when
work has several decisions to lock up-front (it gets a PRD). Single fixes or
chores → a standalone issue in `.agents/issues/`. Move issues with the
[`triage`](.agents/skills/triage/SKILL.md) skill.

**Conventions live next to the work — load only when needed:**

- [`.agents/projects/README.md`](.agents/projects/README.md) — project
  structure (`prd.md` + `wip.md`), kickoff, ship gate, numbering.
- [`.agents/issues/README.md`](.agents/issues/README.md) — issue file shape,
  category templates, statuses, assignee, numbering.

**Session loop**

1. Read `wip.md` "Current focus" → pick a `todo` issue → flip to
   `in-progress`.
2. Implement as a **vertical slice** (end-to-end, not one layer).
3. Run the verify command (Build & test). If it passes and every acceptance
   criterion is met, flip to `done`. If it needs a human check you can't do
   (manual UI, OAuth, judgment), flip to `in-review` + `assignee: human` with
   a `## Review` section. Append a session entry to `wip.md` either way.
4. The maintainer reviews when they choose (optional `reviewed:` date). On
   project ship, archive issues to `.agents/issues/_archive/`.
5. Update specs in `.agents/specs/_specs.md` if you touched user-facing logic.

**Load when the task matches:**

- **User-facing behavior** → the relevant spec indexed in
  [`.agents/specs/_specs.md`](.agents/specs/_specs.md); follow its "How to
  update this spec".
- **Architecture** → [`.agents/architecture/_architecture.md`](.agents/architecture/_architecture.md);
  follow its "How to update these docs".
- **Coding standards** → the matching file in [`.agents/rules/`](.agents/rules/).
- **UI/UX work** → the design references in [`.agents/design/`](.agents/design/).
<!-- loopboard:end -->
