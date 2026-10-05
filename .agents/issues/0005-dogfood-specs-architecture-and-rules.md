---
id: 0005
title: Write loopboard's own specs, architecture docs and rules
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

- Turn the README's "What it does" and "Board behavior" sections into
  `.agents/specs/`: a `_specs.md` index with "How to update this spec" rules, a
  `00-conventions-and-glossary.md`, and one spec per area (inbox/feed, project
  board, backlog, specs view), each with an E2E coverage table.
- Add `.agents/architecture/_architecture.md` (server, client, data flow) with
  "How to update these docs", plus ADRs in `decisions/` for the decisions this
  PRD locks: npx + local server, workspace registry, `.agents/` root with
  detection, sequential branch-aware IDs, WYSIWYG block splice.
- Add `.agents/rules/typescript.md` and `components.md` with this repo's real
  conventions, so the AGENTS.md links resolve.

## Why

The repo is the example of the workflow. Its own specs and ADRs show adopters
what good ones look like, and the Specs view needs real content to demo.

## Acceptance criteria

- [x] The Specs view shows loopboard's specs with coverage percentages — 6 specs, 33 scenarios, 0% (every row ❌ until #0006)
- [x] Every AGENTS.md link resolves (except the Brand Kit, which #0033 adds)
- [x] One ADR per locked decision above — 0001–0005
- [x] README no longer duplicates spec content; it links to the specs

## Findings

Writing the specs from the code (not the old README) surfaced two gaps,
recorded under "Known gaps" in the specs:

- **Wontfix can't be reached from the board** (§ 4): the reason modal and the
  server's `## Why rejected` append still exist, but the one-screen board has
  no Wontfix column to drop on.
- **"/" doesn't reach the Specs search** (§ 6): the placeholder advertises it,
  but "/" focuses the rail search, which switches back to the feed.

Also noted in the TypeScript rules: the status/assignee vocabularies and
issue types are defined twice (server and client).

## Out of scope

- Brand Kit — #0033
- Playwright tests for the scenarios — #0006 adds the harness; later slices add coverage
