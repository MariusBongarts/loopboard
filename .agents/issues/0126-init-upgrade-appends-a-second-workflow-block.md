---
id: 0126
title: init --upgrade appends a second workflow block to a customized AGENTS.md
category: bug
status: todo
assignee: agent
labels: [cli, init, upgrades]
created: 2026-10-27
---

## Steps to reproduce

1. Take a harness whose AGENTS.md has its own workflow section and a
   migration marker (`<!-- loopboard:migration M002 -->`), but no
   `<!-- loopboard:start -->` / `<!-- loopboard:end -->` markers — as
   `~/repos/webhighlights` had on 2026-10-27.
2. Run `loopboard init --upgrade --dry-run` there.

## Current behavior

The plan says `AGENTS.md — appended the workflow block`: a real run adds a
second, complete workflow block below the customized one. It also plans
seed READMEs (`architecture/_architecture.md`, `rules/README.md`, …) that
such a harness doesn't use. On 2026-10-27 the routine pieces of M003 were
applied by hand instead (project 05).

## Expected behavior

`init --upgrade` treats an AGENTS.md with a migration marker but no managed
markers as a customized harness: it leaves AGENTS.md alone, says so, and
points at the upgrade-harness skill ("ask your agent to upgrade my loopboard
harness") for the block's changes. It adds no seed files on `--upgrade`
that a first run would create.

## Acceptance criteria

- [ ] `init --upgrade` on such an AGENTS.md plans `keep` for it, with a note naming the upgrade-harness skill
- [ ] `init --upgrade` plans no seeds (specs, architecture, rules, design, SETUP.md) — shipped skills, READMEs and templates only
- [ ] A first `init` (no marker, no block) still appends the block, as today
- [ ] Spec § 8 "Upgrade an existing harness" names both; Vitest covers both

## Out of scope

- Merging the block's new paragraphs into a customized AGENTS.md — that is
  the upgrade-harness skill's job

## Notes

- `planInit` in `server/init.ts`: the `!agents.includes(BLOCK_START)` branch
  appends regardless of `opts.upgrade`; `seedFiles` runs on upgrades too.
