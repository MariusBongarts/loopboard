---
id: 0070
title: Groom the board with an issue-grooming skill
category: user-story
status: done
assignee: agent
labels: [workflow, skills]
created: 2026-10-06
---

## User story

As a **maintainer whose boards fill up with issues stuck in review (80% in one
repo), stale work and old duplicates**, I want **to say "groom the issues" and
have my agent check every live issue against git, merged PRs and releases,
close what shipped, archive what's finished and ask me about the rest with a
recommendation**, so that **the board shows what's really open without me
triaging issue by issue**.

## Acceptance criteria

- [x] An `issue-grooming` skill covers every live issue (not `_archive/`), any status, including `done` ones left on the board
- [x] It gathers evidence from commits that reference the issue, release tags, CHANGELOG, GitHub releases and merged PRs, `deployed:`, ticked criteria and `wip.md`; and detects duplicates, outdated, stale and unblocked issues
- [x] Clear cases apply without a question: released + fully ticked → `done` (with `deployed:` when missing), cleared parent → `todo`, finished → archived; each move leaves a one-line `## Groomed (date)` note; it never sets `reviewed:`
- [x] Everything else is asked in the chat's question UI (`AskUserQuestion` in Claude Code), grouped by cause, recommendation first; delete only on an explicit choice, otherwise `wontfix` + archive with `## Why rejected`
- [x] A report mode lists what would change without writing
- [x] It's a core skill: installed by `loopboard init`, linked into `.claude/` and `.cursor/`, credited as original, listed in the README, Help → Set up, the skills chapter and the folder map
- [x] The managed AGENTS.md block (and `scaffold/AGENTS.block.md`), the issues and projects READMEs and the triage skill say when to groom; the glossary defines Grooming

## Out of scope

- A deterministic CLI (`loopboard groom`) — the evidence calls need judgment
- A board UI for grooming suggestions
- A migration — a new skill and wording in the block reach running harnesses through `init --upgrade` / upgrade-harness

## Notes

- Report-mode dry run on this repo is the first check; a real run on a big
  board (the 80%-in-review one) is the real test.

## Verification (2026-10-06)

`pnpm verify` and `tests/e2e/cli.spec.ts` pass; init installs and links the
skill. Report-mode dry run on this repo: no tags or releases and no commit
mentions an issue id, so nothing closes itself (correct); 2 standalone `done`
issues would be archived; fully-ticked in-review #0041, #0065, #0066, #0068
would be asked about; partly-ticked #0006, #0013, #0035 left (real checks
pending). The run showed ids are rarely in commit messages, so the skill now
also traces the commit that changed the issue file.
