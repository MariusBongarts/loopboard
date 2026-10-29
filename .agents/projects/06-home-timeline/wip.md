# Home timeline — WIP

> Last updated: 2026-10-29
> PRD: [./prd.md](./prd.md)
> Status: in-progress

## Current focus

Home is built: #0127–#0134 are done and verified. #0135 waits on the
maintainer's review on a real workspace (its `## Review` lists what to
check). After that, the ship gate: archive the issues and set the status to
shipped. Open question for the review: should Home become the landing page?

## Phases

### Phase 1 — Timeline

Goal: Home shows routine runs, the issues they filed, sessions and hand-filed
issues as a timeline, with the routine-health side column.

- [x] [#0127 See routine runs on a Home timeline](../../issues/0127-see-routine-runs-on-a-home-timeline.md) — done
- [x] [#0128 Show the issues a run filed and mentioned, with sessions and hand-filed issues](../../issues/0128-show-the-issues-a-run-filed-and-mentioned.md) — done
- [x] [#0129 See routine health, Needs you and projects beside the timeline](../../issues/0129-see-routine-health-needs-you-and-projects-beside-the-timeline.md) — done

### Phase 2 — Previews

Goal: every run, issue, project and routine on Home opens a preview dialog
with its own link.

- [x] [#0130 Preview a run with its own link](../../issues/0130-preview-a-run-with-its-own-link.md) — done
- [x] [#0131 Preview issues, projects and routines from Home](../../issues/0131-preview-issues-projects-and-routines-from-home.md) — done

### Phase 3 — Polish

Goal: new-since-last-visit dots, hover cards, live updates, ⌘K, and the
maintainer's review on a real workspace.

- [x] [#0132 Hover an issue link on Home to see a card](../../issues/0132-hover-an-issue-link-on-home-to-see-a-card.md) — done
- [x] [#0133 Mark what is new on Home since the last visit](../../issues/0133-mark-what-is-new-since-the-last-visit.md) — done
- [x] [#0134 Keep Home live and reachable from the keyboard](../../issues/0134-keep-home-live-and-reachable-from-the-keyboard.md) — done
- [ ] [#0135 Document Home and review it on a real workspace](../../issues/0135-document-home-and-review-it-on-a-real-workspace.md) — in-review

## Activity log

### 2026-10-29 (build)

- Built Home in one session on main: the pure model `src/home.ts` (timeline,
  run summary, filed vs mentioned, health, what's new, `?peek=` values) with
  18 Vitest cases that pass in any time zone; `useHome` shared by the view and
  the rail's count; previews with a history-aware chain (`src/peek.ts`);
  `IssueView` reused inside the issue preview with `openIssue` overridden.
- Dates on the timeline are the ones `runs.md` and issues wrote, not the
  viewer's zone, so a run and the issue it filed always share a day.
- Found while testing: Esc stopped working after Back (the focused Back
  button disappeared) — the dialog now takes focus on every preview change;
  the hover card closed when the pointer crossed a chip's own children.
- The brief every run reads now asks for a first line worth showing; the
  scheduled README and docs/routines.md say why. No migration: the brief is
  loopboard's own text and README wording merges on upgrade.
- Re-recorded the visual baselines the new rail entry moved; the inbox ones
  stay with #0112.

### 2026-10-29

- Built three Home prototypes in the lab (A Briefing, B Timeline, C Desk) on
  the shared data layer of the real workspace and routines endpoints; checked
  them on webhighlights' routines and on demo data, light and dark, phone
  width. The maintainer chose B.
- Lessons from real notes that shaped the PRD: notes often have no blank
  lines, so a run's summary is its first line (plus the next when the first
  is a heading), not its first paragraph; "filed by a run" can be derived from
  the note's `#NNNN` references and the issue's created day.
- PRD drafted. No product code.

## Deferred / out of scope (added during execution)

## Ship summary

(Filled in only when status flips to `shipped`.)
