# 12. Editing

> Every document loopboard shows — issues, PRDs, WIPs, specs — is editable in
> place, without noisy diffs and without losing an agent's concurrent edit
> ([ADR-0005](../architecture/decisions/0005-wysiwyg-with-block-splice.md)).

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Edit an issue in rich text | ✅ | [`12-editing.spec.ts`](../../tests/e2e/12-editing.spec.ts): paragraph + checklist; the file differs only in those lines. Splice rules unit-tested in `tests/splice.test.ts` |
| Edit an issue's fields | ✅ | `12-editing.spec.ts`: title (quoted), status, assignee; line edits unit-tested in `tests/frontmatter.test.ts` |
| Link an issue with # | ✅ | `12-editing.spec.ts` |
| Switch to Source | ✅ | `12-editing.spec.ts`: the rich draft carries over, then saves from Source |
| Save, or cancel without losing work | 🟡 | `12-editing.spec.ts`: ⌘S saves and closes. Not asserted: the discard confirmation |
| A change on disk while editing | ✅ | `12-editing.spec.ts`: heads-up, conflict, Compare, Keep mine, Reload theirs, silent follow; store unit-tested in `tests/docs.test.ts` |
| Tables and HTML survive rich editing | ✅ | `12-editing.spec.ts` (a spec with a table); `tests/frontmatter.test.ts` |
| Edit a PRD, WIP or spec | ✅ | `12-editing.spec.ts`: PRD and spec; WIP uses the same tab code |

### Scenario: Edit an issue in rich text

```
GIVEN an issue open in the drawer
WHEN I click "Edit"
THEN the body opens in a rich-text editor (Rich mode, remembered per browser)
    with a toolbar: bold, italic, heading, bullet list, checklist, code
AND checklist boxes toggle with one click
WHEN I save (⌘S or "Save")
THEN only the blocks I changed are rewritten; every untouched line keeps its
    exact bytes, however the editor would have formatted it
AND the drawer shows the saved issue
```

### Scenario: Edit an issue's fields

```
GIVEN the rich editor for an issue
THEN title, status, assignee, project, parent and labels are form fields,
    never raw YAML
WHEN I change them and save
THEN only those frontmatter lines change (a missing field is inserted next
    to its neighbours, a cleared project or parent is removed); comments,
    field order and unknown fields survive; titles YAML would misread are
    quoted
```

### Scenario: Link an issue with #

```
GIVEN I'm typing in the rich editor
WHEN I type "#" followed by digits or words
THEN up to eight matching issues (by number or title) are suggested
AND ↑/↓ choose, Enter or Tab inserts "#NNNN ", Esc dismisses
```

### Scenario: Switch to Source

```
GIVEN unsaved changes in Rich mode
WHEN I switch to Source
THEN the raw file, frontmatter included, shows those changes
AND switching back to Rich keeps edits made in Source
```

### Scenario: Save, or cancel without losing work

```
GIVEN unsaved changes ("Unsaved" shows next to the path)
WHEN I click Cancel or press Esc
THEN I'm asked "Discard your changes?" with Discard / Keep editing
AND clicking the drawer's backdrop doesn't close it while I'm editing
AND the editor stays disabled until the file has loaded, so early typing is
    never overwritten
```

### Scenario: A change on disk while editing

```
GIVEN I'm editing a file
WHEN an agent changes it and I have no unsaved edits
THEN the editor follows the new version silently
WHEN an agent changes it while I have unsaved edits
THEN "This file changed on disk. Saving will ask what to do." shows
WHEN I save
THEN nothing is written; "Changed on disk" offers Reload theirs, Compare and
    Overwrite with mine
AND Compare shows a line diff (on disk vs yours) with Keep theirs / Keep mine
```

### Scenario: Tables and HTML survive rich editing

```
GIVEN a document with tables, raw HTML, comments or link definitions
WHEN I open it in Rich mode
THEN each such block shows as a "Raw markdown" source box I can still edit
AND on save it is written back exactly as in the box — byte-for-byte when
    untouched
```

### Scenario: Edit a PRD, WIP or spec

```
GIVEN a project's PRD or WIP tab, or a spec in the Specs view
WHEN I click "Edit PRD" / "Edit WIP" / "Edit spec"
THEN the same editor opens with the same save and conflict rules
AND after saving a spec, its coverage and titles recompute from the file
```
