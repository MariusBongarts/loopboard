# A Linear-like loopboard — WIP

> Last updated: 2026-10-05
> PRD: [./prd.md](./prd.md)
> Status: in-progress

## Current focus

All 14 issues are done; the project waits on your review before it ships
(set Status to `shipped`, archive the issues). Read "Questions for the
maintainer" first — especially 3 and 4.

## Phases

### Phase 1 — New look

Goal: neutral tokens, Inter, icons and shared primitives; every screen already reads neutral.

- [x] [#0045 Adopt neutral tokens, Inter and a rewritten Brand Kit](../../issues/0045-neutral-tokens-inter-and-brand-kit.md) — done
- [x] [#0046 Show status icons, assignee avatars, label pills and project badges everywhere](../../issues/0046-status-icons-avatars-and-pills.md) — done

### Phase 2 — Shell

Goal: the rail filters the feed and reaches every destination; panes resize; settings and open-in-editor.

- [x] [#0047 Rebuild the rail: feed views, workspace destinations, icons and collapse](../../issues/0047-rail-with-feed-views-and-icons.md) — done
- [x] [#0048 Resize the rail, feed and issue panel](../../issues/0048-resizable-panes.md) — done
- [x] [#0049 Add Settings (theme, editor) and open issues in VS Code or Cursor](../../issues/0049-settings-and-open-in-editor.md) — done

### Phase 3 — Issue view

Goal: resizable panel with previous / next, a full page, inline property pickers.

- [x] [#0050 Turn the issue drawer into a resizable panel with previous / next](../../issues/0050-resizable-issue-panel-with-prev-next.md) — done
- [x] [#0051 Open an issue as a full page with its own URL](../../issues/0051-full-page-issue-view.md) — done
- [x] [#0052 Change status, assignee, labels, project and parent in place](../../issues/0052-inline-property-pickers.md) — done

### Phase 4 — Board, list and feed

Goal: Linear-like cards, columns and rows, with right-click menus.

- [x] [#0053 Restyle the board: cards and columns](../../issues/0053-board-restyle.md) — done
- [x] [#0054 Restyle list, feed and Needs you rows](../../issues/0054-list-feed-and-needs-you-rows.md) — done
- [x] [#0055 Right-click menus on cards and rows](../../issues/0055-context-menus.md) — done

### Phase 5 — Everything else

Goal: no screen left in the old style; clean quick-create bodies.

- [x] [#0056 Restyle every remaining screen](../../issues/0056-restyle-remaining-screens.md) — done
- [x] [#0057 Start quick-created issues from a headings-only skeleton](../../issues/0057-quick-create-skeleton-body.md) — done

### Phase 6 — Review

Goal: specs, docs and baselines match the new UI.

- [x] [#0058 Review the new UI end to end and refresh specs, docs and baselines](../../issues/0058-final-review-round.md) — done

## Activity log

### 2026-10-05 — kickoff

- Direction decided with the maintainer: Linear-like neutral (cool grays,
  violet accent, Inter), mark + sans wordmark, resizable issue panel + full
  page, inline property pickers, right-click menus, resizable panes and a
  collapsible rail, feed filters only in the rail. Also: Settings with an
  editor choice (VS Code / Cursor) and headings-only quick-create bodies.
- PRD and #0045–#0058 filed.

### 2026-10-05 — #0045, #0046

- #0045: semantic neutral tokens (violet accent, 7 hue tones, status colors,
  radii, shadows, overlay, motion) replace paper/ink/ember everywhere; no
  hard-coded color left outside the token blocks. Inter + JetBrains Mono,
  Fraunces/Geist removed. Base buttons (primary/secondary/ghost/danger),
  inputs, selects, kbd and focus rings. Wordmark = loop mark + Inter; violet
  favicon. Contrast checker rewritten: 74 pairs incl. status icons ≥ 3:1.
  Brand Kit rewritten; fonts and Lucide credited.
- #0046: `StatusIcon`, `Avatar`, `LabelPill`, `ProjectBadge` in cards, list
  rows, feed rows, the drawer (relations too), backlog, Needs you and ⌘K.
  Found and fixed: dark-mode toast and active chip had white-on-white text.

### 2026-10-05 — #0047–#0052

- #0047: `AppRail` — feed views (Inbox, Needs you, Sessions, Issues) back in
  the rail with icons and counts, Workspace section (All issues, Projects,
  Specs), Views, Projects; chip row removed; collapse to icons (button or
  `[`); Settings dialog replaces the theme button.
- #0048: one resize model (`resize.ts` + `ResizeHandle`) for rail, feed and
  panel: drag, arrow keys, double-click reset.
- #0049: Settings → Editor (None / VS Code / Cursor); "Open in …" link and a
  ⌘K command.
- #0050–#0052: `IssueView` in a resizable panel (no backdrop, ‹ › and j/k
  through the list it came from) and on `/w/:ws/issues/:id`; inline pickers
  for status, assignee, project, labels (create too) and parent on one
  `MenuHost`; PATCH takes labels/project/parent.
- Found and fixed: concurrent PATCHes to one file could drop a change (now
  serialized per file, also for doc saves and the registry); clicking a menu
  item stole focus from its filter; the drag-to-position e2e leaked a
  priority into #0007.
- Removed "Send to backlog" (Status → Backlog does it) and the old Drawer.

### 2026-10-05 — #0053–#0058

- #0053: cards (id + avatar, status icon + title, markers and label pills, no
  path), quiet column lanes with status icons, project pane header, tabs,
  strips and tools restyled; cards are focusable.
- #0054: one `IssueRow` for the list, a project's list layout and Needs you;
  feed rows lead with the status (or session) icon; the list's status chips
  and label select became Status / Label filter menus with Clear.
- #0055: right-click (or Shift+F10) on cards, rows and feed issues: Status ▸,
  Assignee ▸, Labels ▸, Project ▸, Open, Open as page, Open in …, Copy agent
  prompt / path / link, Mark reviewed.
- #0056: projects overview as a list, Specs view, backlog drawer (now a
  panel), modals, Help, welcome; shared `.prose` for rendered markdown.
- #0057: quick-created issues get the template's headings and one empty
  checklist item, nothing else.
- #0058: specs reworded from "drawer" to panel/page; styles.css down from
  1877 to ~960 lines (component layout moved into SFCs); `noUnusedLocals`
  on; architecture, Brand Kit, CHANGELOG updated; 171 unit + 79 e2e tests,
  smoke, contrast all green; baselines regenerated and reviewed.
- Found and fixed: menus overflowed the window bottom (clamp read the element
  before render); list dates wrapped; drag tests dropped onto the board's
  autoscroll edge.

## Questions for the maintainer

1. **"Send to backlog" is gone.** The Status picker (and soon the right-click
   menu) does it. Bring the one-click button back for todo issues?
2. **Edit mode still edits title, fields and body together.** With pickers,
   the fields form in Edit mode duplicates them. Proposal: inline title
   editing and Edit for the body only. Not done yet.
3. **Ship it?** Every issue is done and verified by tests and screenshots, but
   this is a big visual change — have a look (`pnpm dev`) before setting the
   project to `shipped`. The baselines in `tests/e2e/__screenshots__` show
   every main screen in both themes.
4. **Category on cards.** Task / Story / Bug no longer shows on cards or rows
   (still in the issue view). Bring back a small bug marker?
5. **Spec glyphs.** The Specs view still uses the coverage emoji (✅ 🟡 ⏳ ❌)
   from the spec format in its chips. Keep, or switch to drawn icons?
6. **Panel covers the board's right columns** at ≤1440 px. Linear does the
   same; the page view and resizing are the escape hatches. OK?

## Deferred / out of scope (added during execution)

- None yet.

## Ship summary

(Filled in only when status flips to `shipped`.)
