---
id: 0093
title: Show how harnesses depend on each other on the Overview
category: user-story
status: backlog
assignee: agent
project: 04-harness-tree
phase: 3
parent: 0091
labels: [ui, structure]
created: 2026-10-13
---

## User story

As a **maintainer**, I want **a Connections section on the Overview that
lists every dependency crossing a harness or project boundary, with the
status of both sides**, so that **I see what holds up what without opening
each issue**.

## Acceptance criteria

- [ ] The Overview gains a "Connections" section: one row per `blocked-by` entry (and `parent:`) whose two ends lie in different harnesses or in different projects of one harness
- [ ] Each row shows both ends — harness, id, title, status — and which one is blocked by which; a project as blocker shows its project status
- [ ] "Open only" is the default and hides connections whose blocker is done; an end loopboard can't reach is shown as unknown and never hidden
- [ ] Rows are grouped by the harness that is blocked, and clicking either end opens it in its workspace
- [ ] The data comes from the harness index the Overview already reads (#0084, with the `blocked-by` field from #0091) — no additional read of any harness
- [ ] Spec § 7 gains the scenario; an e2e test on the fixture tree shows one cross-harness and one cross-project connection, and hides the done one by default

## Out of scope

- A graph drawing of the tree's dependencies — a list answers "what holds up what"; a picture can follow if the list gets long
- `waiting-on` — that connects an issue to a person; the Overview names whom each harness waits on (#0092)
- Dependencies declared on a project itself — deferred in `wip.md`

## Notes

- PRD story 42. Connections inside one project are deliberately left out:
  the project's own board and the issue view already show them.
- Also needs #0092: this is a section of that page.
- Mentions (`shop#0412` in a body) are not dependencies and don't appear
  here; only `blocked-by` and `parent:` do.
