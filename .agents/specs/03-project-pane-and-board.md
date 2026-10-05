# 3. Project pane and board

> The right pane always shows the project of the selected feed item: its
> board, plus its PRD, WIP and Activity as tabs. Standalone issues share one
> board without tabs.

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| The pane follows the selected item | 🟡 | `03-project-pane-and-board.spec.ts`: project vs standalone board, selected card outlined. Not asserted: header meta, filter reset |
| Open another project's board from a feed row | ✅ | `03-project-pane-and-board.spec.ts` |
| The board shows five columns | 🟡 | `03-project-pane-and-board.spec.ts`: column names, Board tab count. Card contents and order unit-tested (`boardColumnIssues`) |
| Archived issues sit at the end of Done | 🟡 | `03-project-pane-and-board.spec.ts`: archived card last in Done. Dashed / not draggable not asserted |
| Filter the board | 🟡 | `03-project-pane-and-board.spec.ts`: assignee and text filter. Not asserted: label chips |
| Current focus and the selected item open from badges | ✅ | `03-project-pane-and-board.spec.ts`: focus and selection badges, popover closes on Esc and outside click |
| Read the PRD, WIP and activity | ✅ | `03-project-pane-and-board.spec.ts`: PRD text, a `#NNNN` link in WIP opens the panel, sessions newest first |
| See what blocks an issue | ✅ | [`03-project-pane-and-board.spec.ts`](../../tests/e2e/03-project-pane-and-board.spec.ts), including "After" for a done parent; index unit-tested in `tests/relations.test.ts` |
| Hide issues that are waiting | ✅ | `03-project-pane-and-board.spec.ts` |
| Empty columns shrink | ✅ | `03-project-pane-and-board.spec.ts` |
| Hide the feed for a wider board | ✅ | `03-project-pane-and-board.spec.ts` |
| Columns out of view are hinted | ✅ | `03-project-pane-and-board.spec.ts` |
| See every project's progress | ✅ | `03-project-pane-and-board.spec.ts`; phase parsing and counts unit-tested in `tests/projects.test.ts` |

### Scenario: The pane follows the selected item

```
GIVEN I select a feed item
THEN the pane shows that item's project, with its PRD number, title,
    status and "last session <relative day>"
AND a standalone issue shows the "Standalone issues" board
AND a selected issue is outlined on the board and scrolled into view,
    with the board's filters reset so it is visible
```

### Scenario: Open another project's board from a feed row

```
GIVEN a feed row shows its project's name
WHEN I click the project name
THEN the pane shows that project's board
AND it stays there until I select another feed item
```

### Scenario: The board shows five columns

```
GIVEN a project's board
THEN it shows Todo, Blocked, In progress, In review and Done
AND cards in a column are ordered by priority (1 first), then unprioritised
    cards by id
AND each card shows its number, status icon, title, markers (waiting,
    reviewed, deployed), labels and the assignee's avatar — no file path
AND columns show the status icon, name and count; cards can be focused and
    opened with Enter
AND the Board tab counts the board's issues
AND backlog and wontfix issues are not columns on the board
```

### Scenario: Empty columns shrink

```
GIVEN a column has no cards (for example after filtering to Agent)
THEN it shrinks to a slim strip with its name written vertically
AND it is still a drop target; dropping a card there widens it again
```

### Scenario: Hide the feed for a wider board

```
GIVEN the feed takes room next to the board
WHEN I click ⇤ in the feed header
THEN the feed hides and the board takes its width (remembered per browser)
WHEN I click "⇥ Feed" on the pane, or Inbox / Needs you in the rail
THEN the feed comes back
```

### Scenario: Columns out of view are hinted

```
GIVEN the board is wider than the pane
THEN the edge that hides columns fades out
WHEN I scroll the board to its end
THEN the fade moves to the other edge
```

### Scenario: Archived issues sit at the end of Done

```
GIVEN a project has archived issues
THEN they appear in Done after the live done cards, newest first
AND they are drawn dashed and cannot be dragged
```

### Scenario: Filter the board

```
GIVEN a board
WHEN I pick Everyone, Mine or Agent
THEN the board shows all cards, cards assigned to human (Mine shows their
    count), or cards assigned to agent
WHEN I type in "Filter this board"
THEN only cards matching every word stay
AND switching projects resets both filters
```

### Scenario: Current focus and the selected item open from badges

```
GIVEN the project's WIP has a Current focus paragraph
THEN a small "Focus" badge sits in the pane's title row
AND a second badge names the selected issue (status and #NNNN) or session
    ("Session · <day>")
WHEN I click a badge
THEN a popover shows the focus paragraph (with #NNNN links), or the
    selected issue's title, status and assignee, or the session note
AND Esc, a click outside, or following a link inside closes it
```

### Scenario: Read the PRD, WIP and activity

```
GIVEN a project (not the standalone board)
WHEN I open the PRD or WIP tab
THEN the document renders as markdown, and issue links open the issue panel
WHEN I open the Activity tab
THEN every dated session is listed newest first with its note
AND the tab counts the sessions
AND a project without dated entries says so
```

### Scenario: See what blocks an issue

```
GIVEN #0001 has `parent: 0002` and #0002 isn't done
THEN #0001's card shows "waiting on #0002"
WHEN I open #0001
THEN a Relations strip shows "Blocked by #0002 Cache the feed" with its status
WHEN I click it
THEN #0002 opens, showing "Blocks · 0/1 done" with #0001 in a checklist
AND a parent that doesn't exist shows as "#NNNN — no such issue"; an
    archived done parent counts as done
AND once the parent is done (or wontfix) the strip reads "After #0002 …"
    instead of "Blocked by"
```

### Scenario: Hide issues that are waiting

```
GIVEN some issues on the board are waiting on an unfinished parent
THEN the board tools show "Hide waiting N"
WHEN I turn it on
THEN those cards disappear until I turn it off or switch projects
```

### Scenario: See every project's progress

```
WHEN I click Projects in the rail (or "Go to Projects" in ⌘K)
THEN /w/<workspace>/projects lists every project grouped Active / Paused /
    Shipped, most recent session first
AND each shows its PRD number, title, last session, how many issues need me,
    and a closed/total bar (done and wontfix count as closed; archived issues
    count; backlog ideas don't, so parked ideas never hold a project below 100%)
AND one small bar per `### Phase …` heading in the WIP's Phases section,
    counting the issues it lists (dated headings, and headings with nothing
    scheduled such as "Backlog", get no bar)
WHEN I click a project
THEN its board opens
```
