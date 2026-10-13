# 11. Capture and commands

> Create work, jump anywhere and hand work to an agent without leaving the
> board.

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Create an issue | ✅ | [`11-capture-and-commands.spec.ts`](../../tests/e2e/11-capture-and-commands.spec.ts): `C`, defaults, quoted title, toast, panel, live feed; file shape and umlauts in the slug also in `tests/create.test.ts` |
| Create a project | ✅ | `11-capture-and-commands.spec.ts`: rail "+", PRD tab, files; umlauts in the slug in `tests/create.test.ts` |
| Jump anywhere with ⌘K | ✅ | `11-capture-and-commands.spec.ts`: empty state, issue by number, an action; ranking in `tests/commands.test.ts` |
| Act on the selected issue with ⌘K | 🟡 | `11-capture-and-commands.spec.ts`: group first, move status. Wontfix via ⌘K in `04-changing-issues.spec.ts` |
| Copy an agent prompt | 🟡 | `11-capture-and-commands.spec.ts`: panel and pane; card hover not asserted. All prompt variants in `tests/prompts.test.ts` |

### Scenario: Create an issue

```
GIVEN a workspace
WHEN I press "C" (outside a text field) or click "+" next to the workspace name
THEN a "New issue" dialog opens with the title focused
AND Category (Task / Story / Bug), Status (Todo / Backlog), Assignee
    (Agent / You) and Project (default: the project on screen) are preset
WHEN I type a title and press Enter
THEN <root>/issues/NNNN-<slug>.md is written with the next free number
    (§ 10), the frontmatter I chose and a skeleton of the category template — its
    headings and one empty checklist item where it has checklists, never its
    guidance prose (#0057)
AND a "Created #NNNN" toast shows, the issue appears without a reload and
    opens in the panel
AND titles YAML would misread (e.g. with ": ") are quoted so they read back
    intact
AND the file name stays readable (slug, § 0): "Größe der Übersicht ändern"
    becomes NNNN-groesse-der-uebersicht-aendern.md
```

### Scenario: Create a project

```
GIVEN the rail's projects section
WHEN I click its "+" (or choose "New project" in ⌘K) and enter a title
THEN <root>/projects/NN-<slug>/ gets prd.md and wip.md from the templates,
    dated today, with a kickoff activity-log entry and a current focus that
    says to write the PRD
AND the folder name stays readable (slug, § 0): "Größe der Übersicht ändern"
    becomes NN-groesse-der-uebersicht-aendern
AND the project opens on its PRD tab
```

### Scenario: Jump anywhere with ⌘K

```
WHEN I press ⌘K (Ctrl+K)
THEN a palette opens with actions (New issue, New backlog idea, New project,
    Refresh (§ 2), Go to Inbox, Go to Specs, Open Help) and the other workspaces
WHEN I type
THEN issues (by number or title), projects, specs and actions that match every
    word are listed, best match first
AND ↑/↓ move, Enter runs, Esc closes; ⌘K again toggles it
```

### Scenario: Act on the selected issue with ⌘K

```
GIVEN an issue is open in the panel or selected in the feed
WHEN I press ⌘K
THEN "#NNNN: move to …" for every other status, "assign to you / the
    agent", "copy agent prompt" and, for done issues, "mark reviewed" come
    first
AND "move to Wontfix" asks for the reason first (§ 4)
```

### Scenario: Copy an agent prompt

```
GIVEN an issue (card hover, panel, right-click, ⌘K) or a project (pane header)
WHEN I choose "Copy agent prompt"
THEN the clipboard holds the right skill invocation:
    - a ready issue → "Use the implement skill on #NNNN."
    - assigned to me with ## Questions → read the answers and continue
    - in review → walk me through its ## Review section
    - backlog → sharpen it into a ready issue
    - a project whose PRD is still the template → write the PRD with to-prd
    - a project without issues → run to-issues on it
    - otherwise → continue the project from its current focus
AND a toast confirms "Agent prompt copied"
```
