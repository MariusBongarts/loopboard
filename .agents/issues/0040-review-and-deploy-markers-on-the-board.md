---
id: 0040
title: Show reviewed and deployed markers and mark an issue reviewed in one click
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 5
parent: 0039
labels: [ui, workflow]
created: 2026-10-04
---

## User story

As a **developer**, I want **to see which done issues I've reviewed or deployed, filter to "done · not reviewed", and mark one reviewed with one click**, so that **review is a queue I can work through when I choose, not a column that blocks the loop**.

## Acceptance criteria

- [x] The server reads `reviewed:` and `deployed:` as ISO days (same normalisation as `created:`)
- [x] Cards and the drawer show small "reviewed" / "deployed" badges with the date on hover
- [x] The drawer has "Mark reviewed" (writes today's date via the targeted frontmatter rewrite) and "Unmark"
- [x] The board filter offers "Done · not reviewed" with a count
- [x] Specs updated; Playwright covers marking an issue reviewed

## Out of scope

- Setting `deployed:` from a deploy pipeline — a later hook or skill

## Notes

- PRD story 50.

## Outcome

- Server reads `reviewed`/`deployed`; `mutate` sets/removes them via a shared `setLine`. Drawer badges + Mark/Unmark reviewed, card badges, "Done · not reviewed N" board toggle, ⌘K action.
- Fixed on the way: every board write had been deleting the blank line between frontmatter and body; writes now replace the frontmatter block in place (byte-preservation test).
