# 7. Workspaces

> One running loopboard knows many repos ([ADR-0002](../architecture/decisions/0002-workspace-registry-in-user-config.md)).
> Each registered repo is a **workspace**; the switcher sits in the top-left
> corner of the rail.

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Open the last-used workspace | ✅ | [`07-workspaces.spec.ts`](../../tests/e2e/07-workspaces.spec.ts) |
| Switch workspace from the top-left | 🟡 | `07-workspaces.spec.ts`: menu, counts, current, switching. Not asserted: per-workspace pins/selection |
| A legacy ai/ root works like .agents/ | ✅ | `07-workspaces.spec.ts`; detection unit-tested in `tests/workspaces.test.ts` |
| Add a workspace by path | ✅ | `07-workspaces.spec.ts`: suggestions, keyboard pick, add + open. Ids for folder names with umlauts in `tests/workspaces.test.ts` |
| Adding a folder without a root explains what to do | ✅ | `07-workspaces.spec.ts` |
| Rename and remove workspaces | ✅ | `07-workspaces.spec.ts`; files untouched asserted |
| See what needs me across all workspaces | 🟡 | `07-workspaces.spec.ts`: totals, groups, deep link with selection. Not asserted: skipped list, refresh on focus |
| A workspace whose folder disappeared | 🟡 | `07-workspaces.spec.ts`: "folder missing" in the menu. Not asserted: opening it |
| List workspaces from the terminal | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts) runs the built binary from a folder without a root or git, no board running: table, `--json`, empty registry. Same in `tests/workspaces.test.ts` |
| Forget workspaces from the terminal | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): unknown id forgets nothing, files and saved views stay, the running board's switcher drops the entry on reload. Several ids at once and waiting for another writer of the registry in `tests/workspaces.test.ts` |

### Scenario: Open the last-used workspace

```
GIVEN I registered several repos
WHEN I open loopboard at /
THEN it opens the workspace I used last, at /w/<workspace>
AND the browser tab reads "<workspace name> · loopboard"
AND a bookmarked /w/<workspace> URL opens that workspace directly
```

### Scenario: Switch workspace from the top-left

```
GIVEN the rail shows the current workspace's initial and name at the top
WHEN I click it
THEN a menu lists every workspace with its number of issue files
AND the current one is highlighted
WHEN I pick another workspace
THEN its feed, projects and specs load and the URL becomes /w/<workspace>
AND pins, the last selected item and the Specs view state are remembered
    per workspace
```

### Scenario: A legacy ai/ root works like .agents/

```
GIVEN a workspace whose repo keeps its issues under ai/
WHEN I open it
THEN its issues, projects and specs show like any other workspace
AND issue paths read "ai/issues/NNNN-slug.md"
```

### Scenario: Add a workspace by path

```
GIVEN the switcher menu
WHEN I choose "+ Add workspace…"
THEN a dialog asks for the repo's root folder, starting at "~/"
AND as I type, folders under the typed path are suggested, marked
    "has .agents" when they hold a root
AND ↑/↓ move through suggestions, Tab or Enter takes one
WHEN I press Enter (or "Add workspace") on a repo path
THEN the repo is registered and opens at /w/<workspace>, its id being the
    folder name as a slug (§ 0): "Büro" opens at /w/buero, however the name
    is composed on disk or in the path I typed — it is one workspace either
    way
AND adding a repo that is already registered just opens it, under the id it
    already has
```

### Scenario: Adding a folder without a root explains what to do

```
GIVEN the Add workspace dialog
WHEN I add a folder that has neither .agents/issues nor ai/issues
THEN the dialog stays open with "No .agents/ or ai/ folder with issues/
    found in <path>. Run `loopboard init` there first."
```

### Scenario: Rename and remove workspaces

```
GIVEN the switcher menu
WHEN I choose "Manage workspaces"
THEN every workspace is listed with its root path
WHEN I rename one
THEN the new name shows in the switcher
WHEN I choose "Remove…" and confirm
THEN the workspace is forgotten, its files stay untouched
AND removing the current workspace opens another one (or the empty start)
```

### Scenario: A workspace whose folder disappeared

```
GIVEN a registered repo was moved or deleted
THEN the switcher lists it greyed out as "folder missing"
AND opening it shows an empty board instead of an error
```

### Scenario: See what needs me across all workspaces

```
GIVEN several workspaces
WHEN I choose "All workspaces · Needs you" in the switcher
THEN /needs-you lists, per workspace, every live issue assigned to me that
    isn't done or wontfix, plus blocked issues, newest first, with a total
AND workspaces with a missing folder are named as skipped
WHEN I click an issue
THEN its workspace opens with that issue selected
AND the list refreshes when I come back to the browser tab
```

### Scenario: List workspaces from the terminal

```
GIVEN several registered repos, one of them moved or deleted
WHEN I run `loopboard workspaces` in any folder — no board running, no git
    needed
THEN every workspace is listed with its id, its name, "exists" or "missing"
    for its folder, and the path of its root
AND `--json` prints the same as a list of { id, name, path, exists }
AND with nothing registered it says so (`--json`: an empty list)
```

### Scenario: Forget workspaces from the terminal

```
GIVEN registered workspaces I no longer want listed
WHEN I run `loopboard workspaces forget <id>…`
THEN those entries leave the registry and each is printed with its path
AND no file in any repo changes; a forgotten workspace's saved views stay in
    the config folder, and the output names the file
AND a running board no longer lists them on its next load, and nothing the
    board writes to the registry at that moment brings them back
WHEN one of the ids is not registered
THEN it exits with 1, names that id and forgets nothing
```
