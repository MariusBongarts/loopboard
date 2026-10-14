---
id: 0092
title: See every harness on one Overview page
category: user-story
status: wontfix
assignee: agent
project: 04-harness-tree
phase: 3
parent: 0081
labels: [ui, workspaces, server]
created: 2026-10-13
---

## Why rejected

Moved out of loopboard on 2026-10-14
([ADR-0009](../architecture/decisions/0009-views-over-a-tree-live-outside-loopboard.md)).
An Overview of the whole tree — like every view over a whole tree of harnesses — belongs to a
tool built on the same files, not to the board. loopboard stays a board per
harness, for code and for documents, and keeps those files readable for
such tools: the identity file, the reserved fields, `workspaces --json` and
stable URLs (#0113). The text below stays as the record of what was
planned.

## User story

As a **maintainer running code repos, a company and private paperwork with
the same agents**, I want **one page that shows every harness as a tree with
what needs me, what's due, who I'm waiting on, which projects are active and
what was last done where**, so that **I see everything I run on one screen
and know where to look next**.

## Acceptance criteria

- [ ] An Overview page shows every registered node as a tree by `parent`: index nodes as group rows, harnesses below them; a node whose parent isn't registered sits at the top level, and a node whose folder is missing is greyed out
- [ ] Each harness row shows its open issues, "Needs you" (the single rule from #0074), overdue issues and the next due date, whom it waits on — the names, longest wait first, with the count — and its active projects with progress and their last session: the date and the first line of the entry
- [ ] A "Recent" section lists the newest dated session entries of all harnesses — date, harness, project, first line — newest first, so "what was last done where" is one look
- [ ] The page reads the harness index from #0084, extended by the fields it needs and by project headers: no issue bodies, each harness read at most once per request. Against the generated 1,000-issue fixture from #0075 the read takes under 300 ms and returns under 300 kB, and the test states that budget
- [ ] Clicking a harness, a project, a count or a recent entry opens that workspace with the matching selection or filter
- [ ] With more than one node registered, `/` opens the Overview instead of the last-used workspace, which stays one click away; the switcher and ⌘K reach the Overview too
- [ ] The e2e tests that start at `/` and expect a workspace — six spec files today, and the fixture always registers two workspaces — move to `/w/<id>` or assert the Overview
- [ ] The page refreshes on open and on window focus, and a harness that fails to read is shown as failed without taking the page down
- [ ] Spec § 7 gains the scenarios and changes "Open the last-used workspace"; an e2e test runs on a fixture tree with an index node above two harnesses
- [ ] The README intro, the project overview in AGENTS.md and Help → Overview describe the tree and harnesses without code — "one board for code, companies and private life"

## Out of scope

- The Connections section — #0093
- The switcher as a tree — #0094
- Searching across harnesses — #0096
- Live-watching every harness — unchanged from #0023
- A written log at the top of the tree, for work the session entries don't cover — #0109
- Editing anything on the Overview — it is a place to look and jump from

## Notes

- PRD stories 39–41. Due and waiting-on come from phase 2; if this lands
  before them, leave those parts out rather than showing zeros.
- Also needs #0084 (the harness index), #0074 (the "Needs you" rule) and
  #0075 (the generated fixture and its measurements).
- "Recent" is derived, not written: every project's WIP already has dated
  session entries, and loopboard already parses their date and first line.
  What it can't show — work on standalone issues, harnesses without
  projects — is the subject of #0109.
- Today's cross-workspace "Needs you" reads every issue of every workspace
  in full; that is the pattern this page must not copy.
- The budget is a first number. Change it only with a measurement, noted in
  the WIP.
