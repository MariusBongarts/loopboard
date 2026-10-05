# 2. Rail and feed

> loopboard is one screen with three panes: the rail, the feed and the
> project pane (§ 3). This section covers the first two.

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| The feed lists sessions and issues by day | 🟡 | [`02-rail-and-feed.spec.ts`](../../tests/e2e/02-rail-and-feed.spec.ts): rows, day groups, newest first, archived excluded, sessions before issues. Not asserted: day labels, scroll loading, `#NNNN` links. Labels unit-tested in `tests/inbox.test.ts` |
| Filter the feed with views and chips | ✅ | `02-rail-and-feed.spec.ts`: rail Needs you, Sessions / Issues chips, Inbox resets |
| Search narrows the feed and the project list | ✅ | `02-rail-and-feed.spec.ts`: "/" focuses, words narrow feed and rail, title, Esc clears |
| Move through the feed with the keyboard | 🟡 | `02-rail-and-feed.spec.ts`: j / k move the selection. Not asserted: loading earlier days |
| The last selected item comes back | 🟡 | `02-rail-and-feed.spec.ts`: selection survives a reload. Not asserted: fallback when the item is gone |
| Narrow the feed to one project | 🟡 | `02-rail-and-feed.spec.ts`. Not asserted: Paused section, empty project opening its board |
| Pin a project to the top of the rail | ✅ | `02-rail-and-feed.spec.ts`: pin, remembered after reload, unpin; order unit-tested |
| Resize the rail | ✅ | `02-rail-and-feed.spec.ts`: drag, remembered after reload, double-click resets |
| The board follows file changes live | 🟡 | `02-rail-and-feed.spec.ts`: live dot, a status change moves the card, a new file appears, selection kept. Not asserted: offline badge and catch-up. Debounce unit-tested in `tests/watch.test.ts` |

### Scenario: The feed lists sessions and issues by day

```
GIVEN projects with dated activity-log sessions and live issues
WHEN I open loopboard
THEN the feed lists every session and every non-archived issue, newest first
AND items are grouped under sticky day headers: "Today", "Yesterday",
    then "Wed, 16 Sep" (with the year when it differs from this year)
AND on the same day sessions come before issues
AND earlier days load as I scroll down
AND a session row shows its project, the note's first sentence as headline
    and the rest as preview; an issue row shows #id, title, status and assignee
AND `#NNNN` references in session notes open that issue
```

### Scenario: Filter the feed with views and chips

```
GIVEN the rail's destinations Inbox, Needs you, Issues, Projects and Specs,
    each with a count, and the feed's chips All / Needs you / Sessions / Issues
WHEN I pick Needs you (rail or chip)
THEN the feed shows only live, open issues assigned to human
WHEN I pick the Sessions or Issues chip
THEN the feed shows only that kind of item
WHEN I pick Inbox (or the All chip)
THEN every item is back
AND the rail's Issues opens the list view (§ 13), Projects the overview (§ 3)
```

### Scenario: Search narrows the feed and the project list

```
GIVEN the rail search box
WHEN I press "/" (outside a text field and with no drawer open)
THEN the search box gains focus with its text selected
WHEN I type words
THEN the feed keeps items matching every word — issue id, title, labels,
    body, session note or project name
AND the rail's project list narrows the same way
AND the feed title reads "Results for “<query>”"
WHEN I press Esc in the search box
THEN the search clears
```

### Scenario: Move through the feed with the keyboard

```
GIVEN the feed is showing and no drawer is open
WHEN I press "j"
THEN the next item is selected and scrolled into view
WHEN I press "k"
THEN the previous item is selected
AND earlier days load as needed to reach the item
```

### Scenario: The last selected item comes back

```
GIVEN I selected an item and reloaded the page
WHEN loopboard opens
THEN that item is selected again and scrolled into view
AND if it no longer exists, the newest item is selected
```

### Scenario: Narrow the feed to one project

```
GIVEN the rail lists every non-shipped project, ordered by last session,
    with paused projects in their own "Paused" section
WHEN I click a project in the rail
THEN the feed shows only that project's sessions and issues
AND if the project has no feed items, its board opens anyway
```

### Scenario: Pin a project to the top of the rail

```
GIVEN I hover a project row in the rail
WHEN I click its pin
THEN the project moves to a "Pinned" section at the top, newest pin first
AND the choice is remembered in this browser
WHEN I click the pin again
THEN the project returns to its normal place
```

### Scenario: Resize the rail

```
GIVEN the rail's right edge
WHEN I drag it
THEN the rail resizes between 180 and 460 px and the width is remembered
WHEN I double-click the edge
THEN the rail returns to its default width
```

### Scenario: The board follows file changes live

```
GIVEN loopboard is open on a workspace
AND a green dot next to the workspace name says it's live
WHEN an agent or my editor creates, edits or moves files under the root
THEN the feed, rail, board and an open issue drawer update within a moment,
    without a reload
AND my selection, open drawer and scroll position stay put
AND a burst of writes causes one refresh, not one per file
WHEN the connection to loopboard drops
THEN an "Offline" badge replaces the dot; clicking it reloads now
AND after reconnecting, changes made in the meantime are fetched
```
