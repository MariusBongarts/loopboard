# A Linear-like loopboard — PRD

> Drafted: 2026-10-05
> Status: in-progress

## Problem statement

loopboard works, but it looks and feels dated next to the tools its users
know: a warm "paper" palette with serif card titles, mono uppercase chips,
heavy colored borders and plain-text controls. Common interactions are
missing — the issue preview can't be resized or opened as a page, properties
can only be changed through an Edit mode, nothing has a right-click menu,
and the feed's filters are split between the rail and a chip row. A solo
developer who lives in Linear all day finds it slower and less pleasant than
it should be.

## Solution

loopboard adopts a calm, neutral, Linear-like look — cool grays, one violet
accent, Inter, small status icons, quiet chips and thin borders — in light
and dark. The issue preview becomes a resizable side panel with previous /
next navigation and an expand-to-page view with its own URL. Status,
assignee, labels, project and parent change in place through small pickers
or a right-click menu on any card or row. Every pane can be resized and the
rail can collapse. The rail is the one place to filter the feed. Issues can
open in VS Code or Cursor, and quick-created issues start from a clean
skeleton instead of template prose.

## User stories

### Look

1. As a **maintainer**, I want a neutral gray UI with a single violet accent, so that loopboard feels as calm and current as the tools I use daily.
2. As a **maintainer**, I want Inter for all interface text and a mono face only for ids and paths, so that the UI reads cleanly at small sizes.
3. As a **maintainer**, I want light and dark themes that both pass contrast checks, so that I can work at any hour.
4. As a **maintainer**, I want each status shown as a small Linear-style icon (backlog, todo, in progress, in review, done, blocked, wontfix), so that I can scan state without reading words.
5. As a **maintainer**, I want agent and human assignees shown as small avatars, so that I see who owns what at a glance.
6. As a **maintainer**, I want labels as small pills with a colored dot and projects as a colored icon + name, so that metadata is quiet but identifiable.
7. As a **maintainer**, I want subtle hover, focus and open/close motion, so that the UI feels responsive without being busy.
8. As a **maintainer**, I want a loop mark + "loopboard" wordmark in the UI font, so that the brand fits the neutral UI.
9. As a **contributor**, I want the Brand Kit to document the new tokens, components and rules, so that UI work stays consistent.

### Navigation

10. As a **maintainer**, I want the rail to list Inbox, Needs you, Sessions and Issues as feed views with counts, so that filtering the feed happens in one place.
11. As a **maintainer**, I want the rail's Workspace section to hold All issues (the list view), Projects and Specs, so that destinations are separate from feed filters.
12. As a **maintainer**, I want icons next to every rail entry, so that the rail is scannable and still usable when collapsed.
13. As a **maintainer**, I want to collapse the rail to icons and expand it again (remembered), so that the board gets more room.
14. As a **maintainer**, I want to drag-resize the rail, the feed and the issue panel, each remembered and reset by double-click, so that I can fit my screen.
15. As a **maintainer**, I want a Settings dialog (theme, editor) reachable from the rail and ⌘K, so that preferences live in one place.

### Issue view

16. As a **maintainer**, I want clicking an issue to open a side panel I can resize, so that I can read it next to the board.
17. As a **maintainer**, I want previous / next buttons (and `j`/`k`) in the panel to step through the issues of the list I opened it from, so that I can review a column or list without closing the panel.
18. As a **maintainer**, I want to expand the panel into a full page with its own URL, so that I can focus on one issue or share a link to it.
19. As a **maintainer**, I want the full page to show the body on the left and properties on the right, so that it reads like a document with metadata alongside.
20. As a **maintainer**, I want to change status, assignee, labels, project and parent from small pickers in the issue view, so that I don't need Edit mode for metadata.
21. As a **maintainer**, I want pickers to be keyboard-navigable and filterable by typing, so that changing a property is fast.
22. As a **maintainer**, I want to open the issue file in VS Code or Cursor with one click, so that I can jump to the source.
23. As a **maintainer**, I want relations, git history and the review marker in the issue view, restyled, so that nothing I had is lost.

### Board, list and feed

24. As a **maintainer**, I want board cards to show a status icon, id, title, labels and an assignee avatar — without the file path — so that cards are compact and scannable.
25. As a **maintainer**, I want column headers with the status icon, name and count, so that columns match the status vocabulary.
26. As a **maintainer**, I want list rows like Linear's — status, id, title, labels, project, assignee, date in one dense line — so that I can scan hundreds of issues.
27. As a **maintainer**, I want feed rows with a clear session / issue distinction and less chip noise, so that the inbox reads like a timeline.
28. As a **maintainer**, I want a right-click menu on cards, list rows and feed issue rows (status, assignee, labels, project, copy prompt / path / link, open in editor, backlog, reviewed, open page), so that common actions are one click away.

### Everything else

29. As a **maintainer**, I want the project pane, projects overview, specs view, Needs you, Help, the welcome page, dialogs, the command palette, toasts and the editor restyled to match, so that no screen looks like the old app.
30. As a **maintainer**, I want issues created from the board to start with the template's headings and empty checklists only, so that guidance prose never ends up in an issue.

## Implementation decisions

- **Semantic tokens replace the paper/ink/ember set.** Backgrounds
  (`--bg`, `--bg-subtle`, `--bg-hover`, `--bg-active`), surfaces, borders,
  four text levels, accent (+ hover, soft, text), focus ring, one color per
  status, seven identity tones for projects and labels, radii, shadows and
  motion. Old names are removed, not aliased, so nothing keeps the old look by
  accident. Dark mode re-values the same tokens. The contrast checker covers
  text levels, accent, status and tone pairs in both themes.
- **Inter + JetBrains Mono, self-hosted.** Fraunces and Geist are removed.
  No request leaves the machine (spec § 14 stays true).
- **Icons from lucide (ISC, tree-shaken, bundled).** Status icons are our own
  SVG component drawn Linear-style, so status reads by shape and color.
  Credited in CREDITS.md.
- **Styles live with components.** The global stylesheet keeps tokens, base
  elements and shared primitives (buttons, inputs, pills, menus, kbd); each
  component's own layout moves into its SFC as scoped styles while it is
  restyled. Shared visuals are components (`StatusIcon`, `Avatar`,
  `LabelPill`, `ProjectBadge`), not copied class lists.
- **One issue view, two shells.** The same issue component renders inside a
  resizable side panel and on a full page at `/w/:ws/issues/:id`. Opening an
  issue may pass the list it came from (board column, list order, feed) so
  previous / next follow that order.
- **Inline edits extend the existing PATCH.** The issue PATCH accepts
  `labels`, `project` and `parent` next to `status` / `assignee`, written with
  the same line-level frontmatter edits (comments and order kept). `project`
  must name an existing project or be empty; `parent` is four digits or
  empty. Writes are optimistic and roll back with the error banner.
- **One menu primitive.** A teleported `Menu` (anchored to an element or the
  pointer, arrow keys, type-to-filter, submenus, Esc) powers property pickers
  and context menus.
- **One resize composable.** Rail, feed and issue panel share a resizer:
  pointer drag, arrow keys on the focused separator, double-click to reset,
  clamped and stored per browser. The rail's collapsed state is stored too.
- **`priority` stays board order.** It is written by drag-to-position, so no
  priority picker is added; a semantic priority would be a new field and a
  migration.
- **Open in editor is a link.** `vscode://file/<abs path>` or
  `cursor://file/<abs path>` from the workspace's absolute root; the
  preference (None / VS Code / Cursor) lives in browser storage with the
  theme.
- **Feed filters move into the rail.** Inbox, Needs you, Sessions and Issues
  are rail entries; the chip row above the feed is removed. The list view is
  renamed "All issues" in the rail.
- **Quick create writes a skeleton.** Headings and empty checklist items from
  the category template; other template lines are dropped.

## Testing decisions

- Every changed or new behavior gets a spec scenario (§§ 2–5, 7, 9, 11–14)
  and a Playwright test that names it in the coverage table; no ❌ rows.
- Visual baselines are regenerated per phase and reviewed in both themes at
  1440 × 900; tolerance stays 0.2%.
- Vitest for pure logic: skeleton bodies, PATCH validation and frontmatter
  edits for labels/project/parent, the resize clamp, menu filtering, the
  editor URL.
- The contrast checker runs in `pnpm verify` against the new token names.
- Prior art: `tests/e2e/04-changing-issues.spec.ts` (writes checked against
  the file on disk), `visual.spec.ts`, `tests/mutate.test.ts`.

## Out of scope

- **Keyboard actions on the selected issue** (S / A / L …) — not chosen for
  this round; ⌘K covers them.
- **Bulk selection and editing** — a large interaction model for a solo
  workflow that rarely needs it.
- **Semantic priority** — see the decision above.
- **Auto-collapsing the feed on narrow windows** — kept manual (wip.md of
  project 01, question 7).
- **Repo-shared saved views and open-issue counts in the switcher** — both
  decided against (project 01 questions 9 and 12).
- **A mobile layout** — loopboard is a desktop tool next to an editor.

## Further notes

- The direction (neutral, violet, Inter, mark + sans wordmark, resizable panel
  + full page, inline pickers, context menus, resizable panes, rail-only feed
  filters) was decided with the maintainer on 2026-10-05.
