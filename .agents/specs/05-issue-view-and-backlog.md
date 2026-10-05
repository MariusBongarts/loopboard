# 5. Issue view and backlog

> One issue view (#0050, #0051) in two shells: a resizable side panel next to
> the board, and a full page with its own URL.

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Open an issue in the side panel | ✅ | [`05-issue-view-and-backlog.spec.ts`](../../tests/e2e/05-issue-view-and-backlog.spec.ts): title, status, a `#NNNN` reference opens that issue, an unknown one stays text, the board stays usable |
| Step through issues in the panel | ✅ | `05-issue-view-and-backlog.spec.ts`: board order, ‹ › and j/k, position |
| Resize the issue panel | ✅ | `05-issue-view-and-backlog.spec.ts`: keys, remembered, double-click resets |
| Open an issue as a page | ✅ | `05-issue-view-and-backlog.spec.ts`: expand, URL, Back, unknown id |
| Open an issue in my editor | ✅ | `05-issue-view-and-backlog.spec.ts`: hidden until chosen, then the link; URL building unit-tested in `tests/editor.test.ts` |
| Copy an issue's file path | ✅ | `05-issue-view-and-backlog.spec.ts`: toast and clipboard text |
| Send an issue to the backlog | ✅ | `05-issue-view-and-backlog.spec.ts`: Status → Backlog |
| Promote an idea from the backlog | ✅ | `05-issue-view-and-backlog.spec.ts`: the file is back byte for byte |
| Close the panel and drawers with Esc | ✅ | `05-issue-view-and-backlog.spec.ts`: menu first, then backlog drawer, then panel |
| Tick a checklist item in the issue view | ✅ | `05-issue-view-and-backlog.spec.ts`; marker flipping unit-tested in `tests/tasks.test.ts` |
| See an issue's git history | ✅ | `05-issue-view-and-backlog.spec.ts`; parsing unit-tested against real git in `tests/activity.test.ts` |

### Scenario: Open an issue in the side panel

```
GIVEN a card, a list row, a feed issue (double-click), a #NNNN reference
    (feed, focus popover, PRD/WIP, issue body) or the pinned selection's title
WHEN I click it
THEN a panel on the right shows the issue's number, type, title, its
    Status, Assignee, Project, Labels and Parent as small pickers (§ 4),
    actions (Edit, Open in …, Copy agent prompt, Copy path, Mark reviewed),
    relations, the body as markdown and its git history
AND there is no backdrop: the board stays usable and clicking another card
    shows that issue in the same panel
AND a reference to an id prefers the live issue over an archived one
AND a #NNNN that matches no issue stays plain text, and so does one in code
```

### Scenario: Step through issues in the panel

```
GIVEN I opened an issue from the board, a list or the feed
THEN the panel shows its position, e.g. "3 / 6", in that list — the board
    reads column by column, top to bottom
WHEN I press j or k (outside text fields, no menu or dialog open), or click
    the ↓ / ↑ buttons
THEN the next or previous issue of that list opens in the panel
```

### Scenario: Resize the issue panel

```
GIVEN the panel's left edge
WHEN I drag it (or focus it and press ←/→, Shift for bigger steps)
THEN the panel resizes between 420 and 1200 px (never wider than the window
    allows) and keeps that width the next time it opens
WHEN I double-click the edge
THEN it returns to 620 px
```

### Scenario: Open an issue as a page

```
GIVEN an issue in the panel
WHEN I click "Open as page" (or "#NNNN: open as page" in ⌘K)
THEN /w/<workspace>/issues/<NNNN> shows the issue with the body on the left
    and its properties, dates, file and actions on the right; archived
    issues add ?archived=1
AND the rail stays; "Back" returns to where I was (or the board)
AND an id that matches no issue says "No issue #NNNN" with a way back
```

### Scenario: Open an issue in my editor

```
GIVEN Settings → Editor is VS Code or Cursor (None by default)
WHEN I open an issue
THEN "Open in VS Code" (or Cursor) links to `vscode://file/<absolute path>`
    (or `cursor://…`) of the issue file, archived issues included
AND ⌘K offers "#NNNN: open in …" for the selected issue
AND with Editor = None, neither appears
```

### Scenario: Copy an issue's file path

```
GIVEN an open issue
WHEN I click "Copy path" (or the file path on the page)
THEN its path relative to the repo is copied and "Path copied" confirms it
```

### Scenario: Send an issue to the backlog

```
GIVEN an open, live issue
WHEN I set its Status to Backlog
THEN the issue's status becomes `backlog` and its card leaves the board
```

### Scenario: Promote an idea from the backlog

```
GIVEN a project with backlog issues
THEN the board tools show "Backlog N"
WHEN I click it
THEN a drawer lists that project's backlog issues
WHEN I click "Promote to Todo" on one
THEN its status becomes `todo` and it leaves the list
WHEN I click a row
THEN the backlog drawer closes and that issue opens in the panel
```

### Scenario: Close the panel and drawers with Esc

```
GIVEN a menu, the backlog drawer or the issue panel is open
WHEN I press Esc
THEN the topmost one closes — a menu first, then the backlog drawer, then
    the panel; the panel's × closes it too
AND Esc does nothing while the wontfix reason modal is open
```

### Scenario: See an issue's git history

```
GIVEN the repo is a git repository
WHEN I open "History" in an issue
THEN it lists, from local git only:
    - branches whose name contains the issue's number
    - the file's own commits, newest first, each with its status change
      ("todo → in-progress", "created as todo") — across the move to _archive/
    - commits whose message mentions #NNNN
AND outside git it says the repo isn't a git repository
AND the history loads only when opened, and refreshes when the issue changes
```

### Scenario: Tick a checklist item in the issue view

```
GIVEN an issue whose body has `- [ ]` / `- [x]` items
WHEN I click a checkbox in the issue (no need to open the editor)
THEN only that line flips in the file (hash-checked; retried once if an
    agent wrote in between) and the box stays as clicked
AND checkboxes inside fenced code are never counted
```
