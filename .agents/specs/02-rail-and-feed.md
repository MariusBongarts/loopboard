# 2. Rail and feed

> loopboard is one screen with three panes: the rail, the feed and the
> project pane (§ 3). This section covers the first two.

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| The feed lists sessions and issues by day | 🟡 | [`02-rail-and-feed.spec.ts`](../../tests/e2e/02-rail-and-feed.spec.ts): rows, day groups, newest first, archived excluded, sessions before issues. Not asserted: day labels, scroll loading, `#NNNN` links. Labels unit-tested in `tests/inbox.test.ts` |
| Filter the feed from the rail | ✅ | `02-rail-and-feed.spec.ts`: Needs you, Sessions, Issues, Inbox resets; no chip row |
| Collapse the rail | ✅ | `02-rail-and-feed.spec.ts`: button and `[`, remembered after reload, entries still work |
| Search narrows the feed and the project list | ✅ | `02-rail-and-feed.spec.ts`: "/" focuses, words narrow feed and rail, title, Esc clears |
| Move through the feed with the keyboard | 🟡 | `02-rail-and-feed.spec.ts`: j / k move the selection. Not asserted: loading earlier days |
| The last selected item comes back | 🟡 | `02-rail-and-feed.spec.ts`: selection survives a reload. Not asserted: fallback when the item is gone |
| Narrow the feed to one project | 🟡 | `02-rail-and-feed.spec.ts`. Not asserted: Paused section, empty project opening its board |
| Pin a project to the top of the rail | ✅ | `02-rail-and-feed.spec.ts`: pin, remembered after reload, unpin; order unit-tested |
| Resize the rail and the feed | ✅ | `02-rail-and-feed.spec.ts`: drag and keys, remembered after reload, double-click resets; clamp unit-tested in `tests/resize.test.ts` |
| See which files the board skipped | ✅ | `02-rail-and-feed.spec.ts`: count in the rail, the list with reasons, the copied prompt, fixed files leave the list live, collapsed tooltip, ⌘K. Every reason unit-tested in `tests/issues.test.ts`, the prompt in `tests/prompts.test.ts` |
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
AND each row starts with an icon — the issue's status, or a session mark —
    then the title (a session's first sentence) and a quiet line with the
    project, `#NNNN` or "Session", and the issue's assignee; a session's
    remaining text follows as a two-line preview
AND `#NNNN` references in session notes open that issue
```

### Scenario: Filter the feed from the rail

```
GIVEN the rail lists the feed views Inbox, Needs you, Sessions and Issues,
    each with an icon and a count, then a Workspace section with All issues,
    Projects and Specs
WHEN I pick Needs you
THEN the feed shows only live, open issues assigned to human
WHEN I pick Sessions or Issues
THEN the feed shows only that kind of item
WHEN I pick Inbox
THEN every item is back
AND there is no second set of filters above the feed
AND All issues opens the list view (§ 13), Projects the overview (§ 3)
```

### Scenario: Collapse the rail

```
GIVEN the rail
WHEN I click the collapse button at its bottom (or press "[")
THEN it shrinks to icons only; labels show as tooltips and every entry still
    works; Needs you keeps a dot when something waits on me
AND the choice is remembered in this browser
WHEN I click expand (or press "[" again)
THEN the full rail is back
```

### Scenario: Search narrows the feed and the project list

```
GIVEN the rail search box
WHEN I press "/" (outside a text field and with no panel, menu or dialog open)
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
GIVEN the feed is showing and no panel, menu or dialog is open
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

### Scenario: Resize the rail and the feed

```
GIVEN the right edge of the rail or of the feed
WHEN I drag it (or focus it and press ←/→, Shift for bigger steps)
THEN the pane resizes — the rail between 180 and 460 px, the feed between
    280 and 600 px — and the width is remembered
WHEN I double-click the edge
THEN the pane returns to its default width (248 / 380 px)
```

### Scenario: See which files the board skipped

```
GIVEN files the board can't show: an issue file with invalid frontmatter,
    one whose name looks like an issue but isn't `NNNN-slug.md` (capitals,
    spaces, a sync conflict copy), one that can't be read, or a project
    folder not named `NN-slug`
WHEN I open the workspace
THEN the bottom of the rail says "N files skipped" — nothing when there are
    none, an icon with that tooltip when the rail is collapsed
WHEN I click it (or run "Show skipped files" from ⌘K)
THEN a dialog lists each path with its reason
AND offers a prompt to copy that asks the agent to fix exactly those files
    and to run `loopboard check` afterwards
AND loopboard changes none of the files itself
WHEN a file is fixed
THEN it leaves the list and shows up on the board without a reload
```

### Scenario: The board follows file changes live

```
GIVEN loopboard is open on a workspace
AND a green dot next to the workspace name says it's live
WHEN an agent or my editor creates, edits or moves files under the root
THEN the feed, rail, board and an open issue panel update within a moment,
    without a reload
AND my selection, open panel and scroll position stay put
AND a burst of writes causes one refresh, not one per file
WHEN the connection to loopboard drops
THEN an "Offline" badge replaces the dot; clicking it reloads now
AND after reconnecting, changes made in the meantime are fetched
```
