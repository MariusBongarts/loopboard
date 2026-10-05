# 4. Changing issues from the board

> The board writes a few frontmatter fields — `status`, `assignee`,
> `priority`, and the `reviewed` / `deployed` markers — and nothing else. Edits are targeted line replacements: field
> order, comments and the body stay untouched. Moving a card to Done does
> not archive it; issues move to `_archive/` when their project ships.

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Drag a card to another column | ✅ | [`04-changing-issues.spec.ts`](../../tests/e2e/04-changing-issues.spec.ts): card moves; the file equals the original with only `status:` changed |
| Drag a card into position within a column | ✅ | `04-changing-issues.spec.ts`: the dropped card takes priority 1, the next one 2 |
| Toggle the assignee on a card | ✅ | `04-changing-issues.spec.ts`: only `assignee:` changes, no drawer opens |
| A failed write is reported and undone | ✅ | `04-changing-issues.spec.ts`: a 500 shows the banner, the card returns, Dismiss clears it |
| Close an issue as wontfix | ✅ | `04-changing-issues.spec.ts` via ⌘K: disabled until a reason, `## Why rejected` appended |
| Mark done work reviewed | ✅ | `04-changing-issues.spec.ts`: mark, badge on card and drawer, unmark restores the file byte for byte |
| Work through the review queue | ✅ | `04-changing-issues.spec.ts` |

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
THEN the assignee flips between agent and human without opening the drawer
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
GIVEN a done issue in the drawer (or selected, via ⌘K)
WHEN I click "Mark reviewed"
THEN `reviewed: <today>` is written after `created:` and a "✓ reviewed" badge
    shows on its card and in the drawer
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
