---
id: 0135
title: Document Home and review it on a real workspace
category: user-story
status: in-review
assignee: human
project: 06-home-timeline
phase: 3
parent: 0134
labels: [docs, home]
created: 2026-10-29
---

## User story

As a **maintainer**, I want **Home specified, in the glossary and checked on a workspace with real routines**, so that **it stays correct and I trust what it shows**.

## Acceptance criteria

- [x] Spec section 16 with scenarios and its E2E coverage table; `_specs.md` lists it
- [x] Glossary: Home, Run summary, Preview
- [x] The brief every run reads, the scheduled README (both copies) and docs/routines.md say a note's first line is its run summary
- [ ] The maintainer opens Home on a workspace with routines and checks the timeline, the previews and the links

## Out of scope

- Nothing beyond the PRD's list

## Notes

- PRD Testing decisions. The last criterion needs the maintainer.

## Review

Everything an agent can check passes: `pnpm verify` (534 tests) and the
Playwright suite, except the two inbox baselines #0112 already tracks.
What needs your eyes, on a workspace with real routines (webhighlights):

1. Open Home (rail, `H` or ⌘K). Does the timeline read well — are the run
   summaries the right line of each note, and are quiet runs quiet enough?
2. Check "Filed" vs "Mentions" on a few runs: is anything listed as filed
   that the run didn't file, or missing?
3. Open a run, follow an issue, go Back, close with Esc; copy a link and open
   it in a new tab.
4. Hover a few issue chips; try a narrow window.
5. Decide whether Home should become the workspace's landing page (PRD out of
   scope for now).
