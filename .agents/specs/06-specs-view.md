# 6. Specs view

> Read-only: coverage tables are edited in the spec files.

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Browse specs with their coverage | 🟡 | [`06-specs-view.spec.ts`](../../tests/e2e/06-specs-view.spec.ts): aggregate %, scenario count, spec title and scenarios. Not asserted: remembered selection. Parsing unit-tested in `tests/specs.test.ts` |
| Search scenarios across specs | 🟡 | `06-specs-view.spec.ts`: "/" focuses the box, words filter scenarios. Not asserted: table-of-contents narrowing, Clear search, Esc |
| Filter scenarios by coverage status | ✅ | `06-specs-view.spec.ts`: toggle, remembered after reload |
| A spec without a coverage table | ✅ | `06-specs-view.spec.ts` (fixture `specs/02-import.md`) |
| A workspace without specs | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): the board of a folder set up with `init --kind docs` |

### Scenario: Browse specs with their coverage

```
GIVEN the root holds numbered spec files `specs/NN-slug.md`
WHEN I click Specs in the rail
THEN the feed and pane are replaced by a table of contents and the
    selected spec
AND each spec shows its weighted coverage (✅ = 1, 🟡 = 0.5, ⏳ = 0, ❌ = 0)
    and the header shows the aggregate across all specs
AND each scenario shows its status glyph, its notes and its GIVEN/WHEN/THEN
AND the selected spec is remembered; without one, the first spec with
    scenarios opens
```

### Scenario: Search scenarios across specs

```
GIVEN the Specs view
WHEN I press "/" or type in the "Search scenarios" box
THEN only scenarios matching every word stay, across all specs
AND the table of contents lists only specs with a match
AND if the open spec has no match, the first matching spec opens
WHEN nothing matches
THEN a "Clear search" button resets the search
WHEN I press Esc in the box
THEN the search clears
```

### Scenario: Filter scenarios by coverage status

```
GIVEN the four status chips ✅ 🟡 ⏳ ❌
WHEN I toggle a chip off
THEN scenarios with that status are hidden
AND the chip selection is remembered in this browser
```

### Scenario: A spec without a coverage table

```
GIVEN a spec file without an `## E2E coverage` table
THEN every scenario counts as ❌ not yet
AND the spec header reads "No coverage table — counted as uncovered"
```

### Scenario: A workspace without specs

```
GIVEN a root without spec files — a harness without code has none
WHEN I open Specs
THEN the pane reads "This workspace has no specs." and says where specs
    would live
AND it doesn't stay on "Loading specs…"
```
