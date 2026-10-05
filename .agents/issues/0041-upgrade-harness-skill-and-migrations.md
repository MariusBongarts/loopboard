---
id: 0041
title: Upgrade running harnesses with an upgrade-harness skill and numbered migrations
category: user-story
status: in-review
assignee: human
project: 01-open-source-launch
phase: 1
parent: 0039
labels: [workflow, setup, skills]
created: 2026-10-04
---

## User story

As a **developer with harnesses already running in several repos (some with customized skills and an `ai/` root)**, I want **to tell my agent "upgrade my loopboard harness" and have it merge the latest skills and conventions into my repo and apply pending workflow migrations, asking before bulk changes**, so that **workflow improvements reach every repo without overwriting my customizations**.

## Acceptance criteria

- [x] `MIGRATIONS.md` lists numbered workflow migrations: what changed, why, how to apply to an existing harness, and which steps need confirmation. M001 = conventions from #0002–#0004; M002 = the review loop from #0039
- [x] A harness records its level in AGENTS.md as `<!-- loopboard:migration MNNN -->`; no marker means M000
- [x] An `upgrade-harness` skill finds the upstream (local clone, installed package or GitHub), reports pending migrations, merges upstream skills/READMEs into local copies (keeping local customizations, adapting `.agents/` paths to the harness root), applies each migration, asks before bulk data edits, and bumps the marker
- [x] A report-only mode lists what would change without writing — dry-run against webhighlights (read-only): root `ai/`, level M000, 9 skills differ (6 only by the credit line; implement, to-issues, triage, grill-with-docs carry real customizations), upgrade-harness new, 34 local-only skills kept, M002 would offer 331 agent-assigned in-review issues → done
- [x] It's a core skill (linked into `.claude/` and `.cursor/`, listed in CREDITS as original); this repo's AGENTS.md carries the latest marker
- [x] The README gives the paste prompt for upgrading an existing harness
- [x] #0011 (init) writes the marker; #0012 (init --upgrade) defers merges and migrations to this skill

## Out of scope

- A deterministic CLI for the merge — #0012 covers untouched files only
- Running it on the maintainer's harnesses — the maintainer does that

## Review

The skill's **upgrade** mode merges by judgment, which only a run on a real,
customized harness can check. Please:

1. In a small harness (e.g. alive, 6 issues), say "upgrade my loopboard
   harness" with this repo as the upstream. Check the merged skills kept
   local additions and that the AGENTS.md marker reads M002.
2. In webhighlights, run it in report mode first, then decide the M002
   in-review cleanup (331 agent-assigned issues).

Flip to `done` (optionally `reviewed:`) when it behaves, or add findings
here.

## Notes

- PRD stories 51–52.
