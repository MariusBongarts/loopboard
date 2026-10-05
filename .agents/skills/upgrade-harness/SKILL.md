---
name: upgrade-harness
description: Upgrade this repo's loopboard harness — merge the latest loopboard skills, issue/project conventions and templates into the local (possibly customized) copies and apply pending workflow migrations from MIGRATIONS.md. Use when the user says "upgrade my loopboard harness", "update my skills", "sync with the latest loopboard", "apply loopboard migrations", or asks whether the harness is up to date.
---

# Upgrade harness

Bring an existing harness (AGENTS.md + skills + an `.agents/` or `ai/` root)
up to the latest loopboard conventions **without losing local
customizations**. Upstream changes arrive two ways: merged skill/README text,
and numbered migrations in upstream `MIGRATIONS.md` that may also touch data
(e.g. bulk status changes).

Modes:

- **Report** — "what would change?", "dry run", or the first run in a repo:
  steps 1–3, write nothing.
- **Upgrade** — all steps. Still ask before every **Confirm first** step.

## 1. Read the harness

- **Root**: `.agents/` if `.agents/issues/` exists, else `ai/` if
  `ai/issues/` exists. Skills always live in `.agents/skills/`.
- **Level**: the `<!-- loopboard:migration MNNN -->` comment in AGENTS.md.
  None means **M000**.
- **Inventory**: which root folders exist (issues, projects, specs,
  architecture, rules, design), which skills are installed, and whether
  `.claude/skills` / `.cursor/skills` are symlinks to `.agents/skills` or
  copies.

## 2. Find the upstream

In order, stopping at the first hit:

1. A path the user named (a loopboard clone).
2. An installed package: `node_modules/loopboard/`.
3. The loopboard GitHub repo's default branch (raw files), once public.

If none works, ask for a path. Confirm it is loopboard: it has
`MIGRATIONS.md` and `.agents/skills/upgrade-harness/`. Upstream's level is
its highest `MNNN`.

## 3. Report

Show, before touching anything:

- `harness M001 → upstream M002`, and one line per pending migration.
- Per upstream skill: **identical** · **upstream changed** · **customized
  locally** · **both changed** · **new upstream** — plus local-only skills
  (always kept).
- Each pending **Confirm first** step with real numbers from this repo
  (e.g. "M002 would move 331 agent-assigned issues from in-review to done;
  oldest from 2026-05-12").

Compare after **path normalization**: upstream writes `.agents/issues`,
`.agents/specs`, … and skill links like `../../specs/`. In an `ai/` harness
those become `ai/issues`, `ai/specs` and `../../../ai/specs/`. Path-only
differences are not customizations.

In report mode, stop here.

## 4. Merge skills and conventions

Files: every upstream skill folder, the issues and projects READMEs, and
their `_templates/`.

- **New upstream skill** → add it, and link it into `.claude/skills` and
  `.cursor/skills` the same way the existing skills are.
- **Identical** → skip.
- **Changed** → there is no common base, so merge by intent: take upstream's
  changes to shared workflow text (steps, rules, vocabulary); keep local
  additions (project-specific sections such as `## Memory`, product names,
  extra rules, local commands). When a hunk could be either, show both
  versions and ask.
- Keep the harness's own build/test/verify commands; upstream skills only
  say "the verify command" and point at AGENTS.md.
- Never delete local-only skills, and never touch issue, project or spec
  content here — data changes happen only in migration steps.

## 5. Apply migrations in order

For each pending `MNNN`, follow its **Apply** steps. For **Confirm first**
steps: show exact counts and the options, then wait. Data edits change single
frontmatter lines only — no body rewrites, never `reviewed:`. After each
migration, set the AGENTS.md marker to that level (add it right below the H1
if missing), so an interrupted run resumes cleanly.

## 6. Verify and summarize

- Check that links in changed files resolve, and run the harness's verify
  command if AGENTS.md defines one.
- Summarize: migrations applied; files added / merged / skipped and why;
  data changes with counts; anything left for the user.
- Don't commit unless asked. Suggest one commit per migration if they want
  a reviewable history.
