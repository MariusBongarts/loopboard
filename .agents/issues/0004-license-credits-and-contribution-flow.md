---
id: 0004
title: Add the MIT license, skill credits and the contribution flow
category: task
status: done
assignee: agent
project: 01-open-source-launch
phase: 1
parent: 0002
labels: [oss, docs]
created: 2026-10-04
---

## What needs to change

- Add an MIT `LICENSE`.
- Add `CREDITS.md`: for each adapted skill, record the upstream repo, author
  and license. grill-me, grill-with-docs, to-prd, to-issues, tdd,
  improve-codebase-architecture, write-a-skill and diagnose read like
  mattpocock/skills adaptations; verify each one rather than assuming.
- Remove the caveman skill and its `.claude/` and `.cursor/` links.
- Add `CONTRIBUTING.md`: GitHub Issues are the intake; an accepted report
  becomes a `.agents/issues` file; PRs reference `#NNNN` and close the GitHub
  issue.
- Add GitHub issue forms for bugs and feature requests.
- Document an optional `source: github#N` frontmatter field in the issues
  README and templates.

## Why

Open-sourcing adapted skills without attribution is dishonest and may breach
their licenses. Contributors need to know how reports turn into work.

## Acceptance criteria

- [x] `LICENSE` (MIT) and `CREDITS.md` exist; every shipped skill is listed as original or adapted
- [x] Every upstream license is checked and recorded; if one is incompatible with MIT, flip this issue to `assignee: human` with a `## Questions` section — all adapted skills come from mattpocock/skills (MIT); caveman (Apache-2.0, JuliusBrussee/caveman via mattpocock/skills) is removed
- [x] caveman is gone from `.agents/`, `.claude/` and `.cursor/`
- [x] `CONTRIBUTING.md` and the bug/feature issue forms exist
- [x] `source:` is documented and the tracker ignores it gracefully — covered by a Vitest read + status-rewrite test

## Findings

Compared each skill file line by line with mattpocock/skills, using the
snapshot before upstream moved everything under `skills/` (e7f0b58):

- Near-verbatim copies: grill-me, tdd, diagnose (incl. the HITL script),
  improve-codebase-architecture, write-a-skill.
- Rewritten but same name and structure: grill-with-docs (formerly
  `domain-model`), to-prd (now `to-spec`), to-issues (now `to-tickets`).
- Original: implement, triage.

Each adapted skill ends with a one-line attribution so the credit travels
with it; #0011 now also ships the full MIT notice with copied skills.

## Out of scope

- Code of conduct, sponsorship, governance — add when there is a community
