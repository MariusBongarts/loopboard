# Home timeline — PRD

> Drafted: 2026-10-29
> Status: in-progress

## Problem statement

Since routines arrived, much of a workspace's work happens while the
maintainer is away: an email check at 08:00, a nightly test run, a weekly
issue filed on Monday. Each routine keeps its own run history, issues appear
on the board without saying where they came from, and project sessions sit in
the feed between them. Coming back to a workspace, the maintainer can't see in
one place what ran, what it found, what it filed and what now waits on them —
they open routines one by one and guess which new issue belongs to which run.

## Solution

Each workspace gets a **Home**: one page that tells the story of the last days
as a timeline, newest first. Every routine run shows its status and a one-line
summary; the issues a run filed sit right under it, and the issues it only
mentioned are chips beside it. Quiet runs that went fine and filed nothing
shrink to one line, so failures and new work stand out. Project sessions and
issues filed by hand join the same timeline. A side column keeps the health of
every routine, what needs the maintainer and the projects that moved in view.
Everything on Home opens a preview dialog with its own link, so a run, an
issue or a project can be shared, bookmarked or reopened exactly as it was.

The design is prototype **B · Timeline** in the Home lab
([`home-prototypes.html`](../../design/prototypes/home-prototypes.html),
chosen 2026-10-29).

## User stories

1. As a **maintainer**, I want a Home entry at the top of the rail, so that
   the overview is one click from anywhere in a workspace.
2. As a **maintainer**, I want Home to list what happened as a timeline
   grouped by day ("Today", "Yesterday", "Tue 27 Oct"), newest first, so that
   I read the last days in order.
3. As a **maintainer**, I want each routine run on the timeline with its time,
   routine name, status and a one-line summary, so that I know what ran and what
   it found without opening it.
4. As a **maintainer**, I want a run that failed, aborted or expired to say so
   with a status tag, so that problems are not mistaken for quiet runs.
5. As a **maintainer**, I want a run that went fine, filed nothing and found
   nothing worth a line to collapse to a single row, so that a nightly routine
   doesn't bury everything else.
6. As a **maintainer**, I want the issues a run filed listed underneath it
   with status, title and project, so that I see where new work came from.
7. As a **maintainer**, I want the issues a run only mentioned shown as quiet
   chips next to it, so that I can follow its references without confusing
   them with what it filed.
8. As a **maintainer**, I want an issue that a run filed not to appear a
   second time as a separate timeline entry, so that the timeline stays short.
9. As a **maintainer**, I want issues filed by hand and project sessions on
   the same timeline, so that Home covers all activity, not only routines.
10. As a **maintainer**, I want to choose the period — Today, 7 days or 30
    days — and have it remembered, so that I can catch up after a day or a
    holiday.
11. As a **maintainer**, I want items that are new since my last visit marked
    with a dot, and a "Mark all seen" action, so that I see at a glance what
    changed since I last looked.
12. As a **maintainer**, I want a routine-health column listing every routine
    with its last-run status, its recent runs as a strip, its next slot or
    "Paused", so that I know whether the autopilot is working.
13. As a **maintainer**, I want a "Needs you" list and the projects with the
    latest sessions in that column, each with a link to the full view, so that
    Home is a starting point and not a dead end.
14. As a **maintainer**, I want a click on a run to open a preview dialog with
    its status, time, duration, host, the issues it filed and mentioned, and
    its whole note rendered with `#NNNN` links, so that I can read a run
    without leaving Home.
15. As a **maintainer**, I want to step to the run before or after in the run
    preview, and see where it sits in the routine's recent runs, so that I can
    compare today with yesterday.
16. As a **maintainer**, I want a click on an issue anywhere on Home to open
    it in a preview that says which run filed it and which runs mentioned it,
    so that an issue's origin is never a mystery.
17. As a **maintainer**, I want a click on a project or a routine to open a
    preview with its focus, sessions or runs, so that I can look closer
    without losing my place.
18. As a **maintainer**, I want every preview to have its own URL, survive a
    reload and close with Esc, the close button or the browser's Back, so that
    I can share and bookmark exactly what I'm looking at.
19. As a **maintainer**, I want to follow a link inside a preview to another
    preview and go back with a Back button, so that I can trace a run to its
    issue and return.
20. As a **maintainer**, I want "Copy link" and "Open in board" in every
    preview, so that I can hand the link on or continue in the full view.
21. As a **maintainer**, I want hovering an issue link to show a small card
    with its status, title, project and the start of its description, so that
    I can tell issues apart without opening them.
22. As a **maintainer**, I want Home to update live when files change — a run
    finishing, an issue filed — so that it never shows a stale picture.
23. As a **maintainer**, I want a helpful empty state when a workspace has no
    routines or nothing happened in the period, so that Home never looks
    broken.
24. As a **maintainer**, I want Home in ⌘K and on a shortcut, so that it is
    reachable from the keyboard like every other view.
25. As a **maintainer** on a narrow window, I want the side column to move
    above the timeline, so that Home works at any width.

## Implementation decisions

- **Home is where a workspace opens** (decided in the #0135 review,
  2026-10-29). It takes `/w/<ws>` and the first rail entry; the feed moves to
  `/w/<ws>/inbox`. An older `/w/<ws>?item=…` link (Needs you, bookmarks)
  redirects to the feed with that item, and `/w/<ws>/home` redirects to Home.
  No harness changes: only URLs inside loopboard move.
- **One pure timeline module does the thinking.** Given issues, projects,
  routines with their runs, "now", the period and the last-seen time, it
  returns the day groups with their events (run, issue, session), the routine
  health rows, the Needs-you list and the projects to show. The view only
  renders. This keeps every rule below testable without a browser and lets
  the Inbox or a future tree view reuse it.
- **A run's summary is the first line of its note.** A first line shorter than
  40 characters (a heading like "📬 NEEDS YOU (4)") takes the next line along,
  joined with " · "; the result is clipped at about 170 characters. Real notes
  often have no blank lines, so "first paragraph" was rejected in the lab. A
  running run without a note reads "Running since HH:MM".
- **Which issues a run filed is derived, not recorded.** An issue counts as
  filed by a run when the run's note references it (the existing reference
  rule for `#NNNN`) and the issue was created on the run's local day; other
  references that exist count as mentioned. An issue filed by a
  `creates: issue` routine is matched exactly through its
  `recurrence: <slug>@<period>`, which the workspace data starts passing to
  the client. A recorded list per run was considered and deferred (see Out of
  scope): the heuristic was right on every real run looked at in the lab and
  needs no change to `finish`, the brief or the dispatcher prompt.
- **A run is identified by its routine and its start minute.** Preview links
  use the routine slug plus the run's timestamp to the minute
  (`2026-10-29T0953`), the same moment `runs.md` uses as its entry heading.
  Two runs of one routine never start in the same minute (a second start is
  refused while one runs).
- **Previews are a query parameter, not a route per kind.** `?peek=` with
  `run/<slug>/<minute>`, `issue/<id>`, `project/<slug>` or `routine/<slug>`
  on the Home route. Opening one pushes a history entry, so Back closes it and
  a chain of previews unwinds one by one; Close rewinds to where the chain
  started. A query parameter lets other views adopt the same previews later
  without new routes. Issue previews reuse the issue panel's content rather
  than a second issue renderer.
- **"Collapsed" has one rule.** A run collapses to one line when its status is
  ok, it filed nothing, and it mentions nothing — or it belongs to a
  `creates: issue` routine and filed nothing. Everything else gets the
  expanded entry.
- **Timeline sources and dates.** Runs carry a time; issues and sessions only
  a date, so on one day runs come first by time, then sessions, then issues
  filed by hand. Archived issues and issues filed by a run shown on the
  timeline are not repeated as their own entries.
- **Last seen is per device.** The "new" dots compare against a timestamp kept
  in the browser per workspace, set by "Mark all seen"; with none, the last
  24 hours count as new. The server stays read-only.
- **No new server endpoints.** Home reads the workspace data and the
  routines summary the board already loads and follows the same live event
  stream. The only server change is passing `recurrence` through on issues.
- **Look and feel follows the Brand Kit**: run status uses the run tokens,
  issue status the status icons, projects their tones; hierarchy from gray,
  not borders; secondary actions on hover.

## Testing decisions

- **Unit (Vitest), the timeline module** — the bulk of the coverage, through
  its one public function: day grouping and order, the period and its start,
  summary extraction (first line, heading join, clip, running), filed versus
  mentioned (same day, other day, missing issue, `recurrence`), the collapse
  rule, nested issues not repeated, archived issues left out, "new" against
  last seen, health rows (paused, running, no runs, next slot) and Needs you
  order. Prior art: `tests/inbox.test.ts` (feed building), `tests/graph.test.ts`
  and `tests/routineView.test.ts` (routine view helpers).
- **E2E (Playwright)** against a fixture harness with routines and runs, in a
  new `16-home.spec.ts`: the rail entry, a failed run tagged, a filed issue
  under its run, a collapsed quiet run, the period switch remembered, a run
  preview opened by click and by URL, Back from issue to run, Esc closing,
  the hover card, a live update when a run finishes. Prior art:
  `tests/e2e/15-routines.spec.ts` (routine fixtures, live update) and
  `tests/e2e/02-rail-and-feed.spec.ts`.
- Specs: a new section `16-home.md` with scenarios and its coverage table;
  the glossary gains **Home**, **Run summary** and **Preview**.

## Out of scope

- **Recording the issues a run filed in `runs.md`** — would change `finish`,
  the brief, the dispatcher prompt and every harness's routines (a migration);
  the derived match is good enough for now. Revisit if a run files issues on
  another day or references read as filed when they aren't.
- **"Recently updated" issues and PRDs** — issues and PRDs carry no
  modification time today; showing edits needs the server to read file times
  or git history. Sessions stand in for project activity until then.
- **Home across several workspaces or a whole tree** — ADR-0009 keeps views
  over a tree outside loopboard; Home is per workspace.
- **Acting from Home** (re-running, pausing, changing status) — Home and its
  previews are read-only like the Routines view; actions stay in their views.
- **The Briefing and Desk prototypes (A, C)** — not chosen; the lab keeps
  them for reference.
- **Notifications** — the dispatcher's platform notifies (ADR-0010).

## Further notes

- New terms for the glossary: **Home** (the per-workspace overview), **Run
  summary** (the one line Home shows for a run — not the **Brief**, which is
  what `routines prompt` prints for an agent) and **Preview** (a dialog with
  its own link over a view).
- The lab page reads live workspaces when served by `pnpm dev`, which is the
  quickest way to try a rule on real notes before changing the module.
