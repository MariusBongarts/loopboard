---
id: 0011
title: Scaffold the workflow in any repo with loopboard init
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 3
parent: 0007
labels: [cli, setup]
created: 2026-10-04
---

## User story

As a **developer adopting the workflow**, I want **`loopboard init` to scaffold `.agents/` with READMEs, templates and the core skills, and wire them into my agent tools, without overwriting anything**, so that **setup is predictable and safe to re-run**.

## Acceptance criteria

- [x] Creates `.agents/{issues,projects,specs,architecture/decisions,rules,design}` with each README and template, sourced from this repo's own `.agents/` files (bundled into the package)
- [x] Installs the core skills (grill-me, grill-with-docs, to-prd, to-issues, implement, triage, upgrade-harness); `--with-extras` adds tdd, diagnose, improve-codebase-architecture, write-a-skill
- [x] Links `.claude/skills` and `.cursor/skills` to `.agents/skills`; copies where symlinks fail (Windows)
- [x] Writes a managed block between markers in AGENTS.md (creates AGENTS.md, and a CLAUDE.md containing `@AGENTS.md`, if missing), including the latest `<!-- loopboard:migration MNNN -->` marker so new harnesses start with nothing pending (#0041)
- [x] Writes `.agents/SETUP.md`: instructions for the agent to adapt AGENTS.md (build/test/verify commands, existing CLAUDE.md) and to ask before importing existing TODOs
- [x] Ships the upstream MIT notice with the adapted skills (e.g. `.agents/skills/CREDITS.md` from the repo's `CREDITS.md`) — MIT requires it in every copy
- [x] Never overwrites an existing file; prints created/skipped per path; a second run creates nothing
- [x] Vitest: empty repo, repo with existing AGENTS.md, re-run idempotency

## Out of scope

- Upgrading an existing setup — #0012
- The paste-in prompt and README — #0013

## Notes

- PRD stories 13, 14. Depends on #0002 (conventions under `.agents/`) and #0004 (final skill list).

## Outcome

- `server/init.ts` plans then applies; generic starters live in `scaffold/`; skill credits moved into `.agents/skills/CREDITS.md` so the MIT notices travel with the skills.
- This repo's AGENTS.md now embeds the managed block verbatim (a Vitest test keeps it in sync with `scaffold/AGENTS.block.md`).
- Re-running init on an `.agents/` harness fills gaps instead of failing; an `ai/` harness is sent to upgrade-harness.
- Verified with the built CLI in a temp repo; spec § 8.
