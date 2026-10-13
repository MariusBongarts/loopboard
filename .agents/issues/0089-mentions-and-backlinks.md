---
id: 0089
title: Link @mentions and show backlinks on a person's page
category: user-story
status: backlog
assignee: agent
project: 04-harness-tree
phase: 2
parent: 0106
labels: [ui, navigation, data]
created: 2026-10-13
---

## User story

As a **maintainer about to call the accountant**, I want **`@accountant` in
any issue to link to their page, and that page to list every issue that
mentions them or waits on them, across my harnesses**, so that **I see all
open threads with one person in one place**.

## Acceptance criteria

- [ ] `@id` in issue bodies, PRD and WIP documents and feed notes becomes a link to that object's page when the id belongs to a person or organisation of the tree; any other `@word`, and anything in code, in links or in an email address, stays as it is
- [ ] An object's page lists its backlinks: every issue that mentions `@id` in its body or names it in `waiting-on`, from every harness of the tree, grouped by harness, each with status, title and — for waiting issues — since when
- [ ] Open issues come first and closed ones sit behind a "Show closed" toggle; clicking a backlink opens the issue in its workspace
- [ ] Backlinks come from the server as rows of id, title, status and harness — the browser never loads every workspace to compute them. Mentions live in bodies, so the server scans them: one pass per harness, cached per file
- [ ] The people-and-organisations spec section gains the scenarios for mention links and backlinks; an e2e test on the fixture tree finds, on a person's page, an issue from each of two harnesses

## Out of scope

- Backlink counts on an organisation's page for its people — the list of people is on the page (#0106); counting their threads can follow
- Mentions in specs, architecture docs and files outside `issues/` and `projects/`
- A notification or an activity feed per person
- Typing `@` to pick a person in the editor — a follow-up once the picker from #0107 exists
- Backlinks for issues ("mentioned in …") — a different index; see #0091 for blockers

## Notes

- PRD stories 31, 32. Mentions use the shared parser from #0082, extended by
  the `@id` form, so the board and `check` agree on what a mention is.
- Also needs #0082 (the parser) and #0088 (`waiting-on`). If #0088 still
  waits on its questions, ship the mention links and the body backlinks and
  leave the waiting rows to follow.
- Only ids that exist are linked — that is what keeps a social-media handle
  or a decorator in a code sample from turning into a broken link.
- The body scan is the one cross-harness read that can't come from the
  harness index (#0084); cache per file the way #0075 proposes for parsed
  issues.
- Archived issues count as closed backlinks.
