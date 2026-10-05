# 5. Issue drawer and backlog

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Open an issue in the drawer | ✅ | `05-issue-drawer-and-backlog.spec.ts`: title, status, a `#NNNN` reference opens that issue, an unknown one stays text |
| Copy an issue's file path | ✅ | `05-issue-drawer-and-backlog.spec.ts`: "Copied" and the clipboard text |
| Send a todo issue to the backlog | ✅ | `05-issue-drawer-and-backlog.spec.ts` |
| Promote an idea from the backlog | ✅ | `05-issue-drawer-and-backlog.spec.ts`: the file is back byte for byte |
| Close drawers with Esc | ✅ | `05-issue-drawer-and-backlog.spec.ts`: issue and backlog drawers |
| Tick a checklist item in the drawer | ✅ | `05-issue-drawer-and-backlog.spec.ts`; marker flipping unit-tested in `tests/tasks.test.ts` |
| See an issue's git history | ✅ | [`05-issue-drawer-and-backlog.spec.ts`](../../tests/e2e/05-issue-drawer-and-backlog.spec.ts); parsing unit-tested against real git in `tests/activity.test.ts` |

### Scenario: Open an issue in the drawer

```
GIVEN a card, a #NNNN reference (feed, strips, PRD/WIP, drawer body) or the
    pinned selection's title
WHEN I click it
THEN a right-side drawer shows the issue's title, status, assignee, project,
    phase, parent, created date and "archived" when it is
AND the body renders as markdown
AND a reference to an id prefers the live issue over an archived one
AND a #NNNN that matches no issue stays plain text, and so does one in code
```

### Scenario: Copy an issue's file path

```
GIVEN the drawer shows the issue's path relative to the repo
WHEN I click the path
THEN it is copied to the clipboard and "Copied" shows briefly
```

### Scenario: Send a todo issue to the backlog

```
GIVEN the drawer shows a live issue with status todo
WHEN I click "Send to backlog"
THEN the drawer closes and the issue's status becomes `backlog`
AND the card leaves the board
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
THEN the backlog drawer closes and that issue opens in the issue drawer
```

### Scenario: Close drawers with Esc

```
GIVEN the backlog drawer or the issue drawer is open
WHEN I press Esc or click the backdrop
THEN the topmost drawer closes
AND Esc does nothing while the wontfix reason modal is open
```

### Scenario: See an issue's git history

```
GIVEN the repo is a git repository
WHEN I open "History" in an issue's drawer
THEN it lists, from local git only:
    - branches whose name contains the issue's number
    - the file's own commits, newest first, each with its status change
      ("todo → in-progress", "created as todo") — across the move to _archive/
    - commits whose message mentions #NNNN
AND outside git it says the repo isn't a git repository
AND the history loads only when opened, and refreshes when the issue changes
```

### Scenario: Tick a checklist item in the drawer

```
GIVEN an issue whose body has `- [ ]` / `- [x]` items
WHEN I click a checkbox in the drawer (no need to open the editor)
THEN only that line flips in the file (hash-checked; retried once if an
    agent wrote in between) and the box stays as clicked
AND checkboxes inside fenced code are never counted
```
