# 9. Help and onboarding

> One setup prompt ([docs/setup-prompt.md](../../docs/setup-prompt.md)) and
> one set of workflow docs ([docs/](../../docs/)) serve the README, the Help
> page and every empty state.

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Open Help from anywhere | ✅ | [`09-help-and-onboarding.spec.ts`](../../tests/e2e/09-help-and-onboarding.spec.ts): `?`, section list, shortcut table, back, rail link |
| Copy the setup prompt | ✅ | `09-help-and-onboarding.spec.ts`: clipboard equals `docs/setup-prompt.md` |
| First visit with no workspaces | ✅ | `09-help-and-onboarding.spec.ts` (workspace list stubbed empty) |
| A set-up workspace with no issues yet | ✅ | `09-help-and-onboarding.spec.ts` |
| A workspace whose folder is gone | ✅ | `09-help-and-onboarding.spec.ts`: page, switcher, recovery by polling, Forget |

### Scenario: Open Help from anywhere

```
GIVEN I'm on a workspace
WHEN I press "?" (outside a text field, no dialog open) or click Help at the
    bottom of the rail
THEN /help opens with: Get started, The loop, What lives where, Statuses and
    fields, Keyboard shortcuts
AND the shortcut table lists exactly the shortcuts the app handles
WHEN I click "← Back to the board"
THEN I'm back on the workspace I came from
```

### Scenario: Copy the setup prompt

```
GIVEN the setup prompt is shown (Help, the welcome page, an empty state)
WHEN I click "Copy setup prompt"
THEN the prompt is on my clipboard and the button reads "Copied" briefly
```

### Scenario: First visit with no workspaces

```
GIVEN no workspace is registered
WHEN I open loopboard
THEN a welcome page explains what loopboard shows
AND offers "add it here" for a repo that's already set up (the Add
    workspace dialog, § 7)
AND shows the setup prompt for a new repo
```

### Scenario: A set-up workspace with no issues yet

```
GIVEN a workspace whose root has no issues, sessions or projects yet
WHEN I open it
THEN the feed shows "Nothing here yet" with the first three things to ask an
    agent (grill me, write a PRD, break it into issues) and a link to Help
AND a "New issue" button (shortcut C) to file one myself
AND the pane says the board appears once there are issues
```

### Scenario: A workspace whose folder is gone

```
GIVEN a registered workspace whose root folder no longer exists
WHEN I open it
THEN a page names the missing path, keeps the workspace switcher, offers
    "Forget this workspace", and shows how to set the repo up again
AND when the folder comes back, the page turns into the board by itself
```
