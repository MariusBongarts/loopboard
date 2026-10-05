# 4. Changing issues from the board

> The board writes a few frontmatter fields — `status`, `assignee`,
> `priority`, and the `reviewed` / `deployed` markers — and nothing else. Edits are targeted line replacements: field
> order, comments and the body stay untouched. Moving a card to Done does
> not archive it; issues move to `_archive/` when their project ships.

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Change an issue's properties in place | ✅ | `04-changing-issues.spec.ts`: every picker, file checked on disk; PATCH validation unit-tested in `tests/mutate.test.ts`, menus in `tests/issueMenus.test.ts` |
| Right-click an issue | ✅ | `04-changing-issues.spec.ts`: card → Status ▸ In review on disk, row → Copy link, Shift+F10 |
| Drag a card to another column | ✅ | [`04-changing-issues.spec.ts`](../../tests/e2e/04-changing-issues.spec.ts): card moves; the file equals the original with only `status:` changed |
| Drag a card into position within a column | ✅ | `04-changing-issues.spec.ts`: the dropped card takes priority 1, the next one 2 |
| Toggle the assignee on a card | ✅ | `04-changing-issues.spec.ts`: only `assignee:` changes, no panel opens |
| A failed write is reported and undone | ✅ | `04-changing-issues.spec.ts`: a 500 shows the banner, the card returns, Dismiss clears it |
| Close an issue as wontfix | ✅ | `04-changing-issues.spec.ts` via ⌘K: disabled until a reason, `## Why rejected` appended |
| Mark done work reviewed | ✅ | `04-changing-issues.spec.ts`: mark, badge on card and panel, unmark restores the file byte for byte |
| Work through the review queue | ✅ | `04-changing-issues.spec.ts` |

### Scenario: Change an issue's properties in place

```
GIVEN an open issue (panel or page)
WHEN I click its Status, Assignee, Project, Labels or Parent
THEN a menu lists the choices with the current one checked; ↑/↓ and Enter
    pick, typing filters (Project, Labels, Parent), Esc closes
AND a pick writes only that frontmatter line, keeping comments and key order
AND Labels stays open for several picks and offers "Create label …" for a
    name no issue uses yet
AND Project lists open projects (plus the current one) and "No project";
    Parent lists live issues except this one and its children, and
    "No parent" — both remove the line when cleared
AND Wontfix asks for a reason first (see "Close an issue as wontfix")
AND archived issues show their properties read-only
AND a failed write is undone and reported, as on the board
```

### Scenario: Right-click an issue

```
GIVEN a card on the board, a row in a list or an issue in the feed
WHEN I right-click it (or press Shift+F10 / the menu key while it has focus)
THEN a menu opens there with Status ▸, Assignee ▸, Labels ▸ and Project ▸
    (the same choices as the pickers), Open, Open as page, Open in … (when an
    editor is set), Copy agent prompt, Copy path, Copy link, and Mark
    reviewed for done issues
AND archived issues offer only opening and copying
```

### Scenario: Drag a card to another column

```
GIVEN a card in Todo
WHEN I drag it to In progress
THEN the card moves immediately
AND the issue file's `status:` line becomes `status: in-progress`
AND nothing else in the file changes — down to the blank line after the
    frontmatter
```

### Scenario: Drag a card into position within a column

```
GIVEN a column with several cards
WHEN I drag a card above another
THEN every card in that column gets `priority: 1..N` in the new order
AND a missing `priority:` line is inserted right after `assignee:`
AND with a board filter active, the hidden cards keep their relative order
```

### Scenario: Toggle the assignee on a card

```
GIVEN a card with an agent or human chip
WHEN I click the chip
THEN the assignee flips between agent and human without opening the panel
AND the file's `assignee:` line is rewritten, or inserted after `status:`
    when missing
```

### Scenario: A failed write is reported and undone

```
GIVEN the server rejects a change (e.g. the file disappeared)
WHEN I drag or toggle
THEN an error banner shows the server's message with a Dismiss button
AND the board reloads from disk, undoing the optimistic move
```

### Scenario: Close an issue as wontfix

```
GIVEN an open issue
WHEN I choose "#NNNN: move to Wontfix" in ⌘K
THEN a dialog asks why; the button stays disabled until I type a reason
WHEN I confirm
THEN status becomes wontfix and the body gets a "## Why rejected" section
    with my reason (only once)
WHEN I cancel
THEN nothing changes
```

### Scenario: Mark done work reviewed

```
GIVEN a done issue in the panel (or selected, via ⌘K)
WHEN I click "Mark reviewed"
THEN `reviewed: <today>` is written after `created:` and a "✓ reviewed" badge
    shows on its card and in the panel
WHEN I click "Unmark reviewed"
THEN the line is removed
AND agents never set reviewed; `deployed:` dates show as "↑ deployed" badges
```

### Scenario: Work through the review queue

```
GIVEN a project with done issues nobody reviewed
THEN the board tools show "Unreviewed N"
WHEN I turn it on
THEN the board shows only those issues, so I can open and mark them one by one
AND switching projects turns it off
```
