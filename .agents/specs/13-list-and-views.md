# 13. List and saved views

> A dense list next to the board, for repos with hundreds of issues. Its
> filters live in the URL, and a saved view is a named copy of them, kept in
> the per-user config — never in the repo.

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Browse every issue as a list | ✅ | [`13-list-and-views.spec.ts`](../../tests/e2e/13-list-and-views.spec.ts); grouping/filters unit-tested in `tests/list.test.ts` |
| Filter the list | ✅ | `13-list-and-views.spec.ts`: group, assignee, URL; status and label menus and Clear |
| Move through the list with the keyboard | ✅ | `13-list-and-views.spec.ts` |
| Save, open, update and delete a view | ✅ | `13-list-and-views.spec.ts`; storage unit-tested in `tests/handler.test.ts` |
| A view whose label is gone | 🟡 | unit-level only (`filtersFromQuery`); the stale label shows in the select |
| Switch a project between board and list | ✅ | `13-list-and-views.spec.ts` |

### Scenario: Browse every issue as a list

```
WHEN I click All issues in the rail (or "Go to Issues" in ⌘K)
THEN /w/<workspace>/issues lists every live issue, grouped by status in
    workflow order, newest first in each group, with a count per group
AND each row shows its number, status icon, title, labels, project, assignee
    and date in one line; group headers show the status icon, project or
    label
AND group headers collapse and expand
AND clicking a row opens the issue in the side panel
```

### Scenario: Filter the list

```
GIVEN the list
WHEN I group by Status, Project, Label or None, pick Everyone / You / Agent,
    tick statuses under "Status", pick a label under "Label" (both menus) or
    type in Filter
THEN the list updates and the URL holds the filters, so a reload or a shared
    link shows the same list
AND "Clear" resets every filter
```

### Scenario: Move through the list with the keyboard

```
GIVEN the list has focus (no text field, no panel)
WHEN I press j / k
THEN the next / previous row is highlighted and scrolled into view
WHEN I press Enter
THEN that issue opens
```

### Scenario: Save, open, update and delete a view

```
GIVEN a filtered list
WHEN I click "Save view" and name it
THEN the view appears under "Views" in the rail and in ⌘K, and opens with
    its filters at /w/<workspace>/issues?…&view=<id>
WHEN I change filters on an open view and click "Rename / update"
THEN the name and filters are updated
WHEN I click "Delete view"
THEN it disappears from the rail; the list stays as it is
AND views are per workspace and live in the user config, not the repo
```

### Scenario: A view whose label is gone

```
GIVEN a saved view filtered by a label no issue carries any more
WHEN I open it
THEN the label still filters (showing nothing) and the select marks it
    "(no issues)"
```

### Scenario: Switch a project between board and list

```
GIVEN a project's board
WHEN I pick List in the board tools
THEN the same issues show as a grouped list, honouring the board's filters
AND the choice is remembered in this browser
```
