# Home timeline — WIP

> Last updated: 2026-10-29
> PRD: [./prd.md](./prd.md)
> Status: in-progress

## Current focus

Kickoff. The PRD is drafted from the Home lab
([`home-prototypes.html`](../../design/prototypes/home-prototypes.html)),
where the maintainer chose prototype B · Timeline on 2026-10-29. Issues #0127–#0135 are filed;
work starts with #0127, the Home route and its run timeline.

## Phases

### Phase 1 — Timeline

Goal: Home shows routine runs, the issues they filed, sessions and hand-filed
issues as a timeline, with the routine-health side column.

- [ ] [#0127 See routine runs on a Home timeline](../../issues/0127-see-routine-runs-on-a-home-timeline.md) — todo
- [ ] [#0128 Show the issues a run filed and mentioned, with sessions and hand-filed issues](../../issues/0128-show-the-issues-a-run-filed-and-mentioned.md) — todo
- [ ] [#0129 See routine health, Needs you and projects beside the timeline](../../issues/0129-see-routine-health-needs-you-and-projects-beside-the-timeline.md) — todo

### Phase 2 — Previews

Goal: every run, issue, project and routine on Home opens a preview dialog
with its own link.

- [ ] [#0130 Preview a run with its own link](../../issues/0130-preview-a-run-with-its-own-link.md) — todo
- [ ] [#0131 Preview issues, projects and routines from Home](../../issues/0131-preview-issues-projects-and-routines-from-home.md) — todo

### Phase 3 — Polish

Goal: new-since-last-visit dots, hover cards, live updates, ⌘K, and the
maintainer's review on a real workspace.

- [ ] [#0132 Hover an issue link on Home to see a card](../../issues/0132-hover-an-issue-link-on-home-to-see-a-card.md) — todo
- [ ] [#0133 Mark what is new on Home since the last visit](../../issues/0133-mark-what-is-new-since-the-last-visit.md) — todo
- [ ] [#0134 Keep Home live and reachable from the keyboard](../../issues/0134-keep-home-live-and-reachable-from-the-keyboard.md) — todo
- [ ] [#0135 Document Home and review it on a real workspace](../../issues/0135-document-home-and-review-it-on-a-real-workspace.md) — todo

## Activity log

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
