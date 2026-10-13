# 8. Setup and upgrades

> `loopboard init` puts the workflow into a repo; agents finish it from
> `.agents/SETUP.md`. Running harnesses take later workflow changes through
> `init --upgrade` (untouched files) and the upgrade-harness skill (merges
> and migrations, [MIGRATIONS.md](../../MIGRATIONS.md)).

## E2E coverage

CLI behavior: [`cli.spec.ts`](../../tests/e2e/cli.spec.ts) runs the built binary
against temp repos; edge cases in `tests/init.test.ts`. Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Set up an empty repo | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts); every path in `tests/init.test.ts` |
| Set up a repo that already has agent instructions | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts) |
| Add the optional skills | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): `.agents/` and `.cursor/skills` |
| Run init again | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts) |
| A legacy ai/ harness is sent to upgrade-harness | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts) |
| Upgrade untouched files | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): updated vs skipped (edited locally), `--dry-run` writes nothing. Block refresh and `--force` in `tests/init.test.ts` |

### Scenario: Set up an empty repo

```
GIVEN a repo without .agents/
WHEN I run `npx loopboard init`
THEN .agents/ gets issues/ and projects/ (README + templates), specs/,
    architecture/, rules/ and design/ (starter READMEs), and the core skills
    grill-me, grill-with-docs, to-prd, to-issues, implement, triage,
    issue-grooming and upgrade-harness with their CREDITS.md
AND .claude/skills links each skill (and .cursor/skills when the repo has
    .cursor/); where links aren't allowed, the skills are copied
AND AGENTS.md is created with the managed workflow block, the latest
    migration marker and an empty "Build & test"; CLAUDE.md imports it
AND .agents/SETUP.md tells the agent how to finish: fill in the overview and
    commands, keep existing instructions, ask before importing old TODOs
AND the command lists every created and linked path and suggests the next step
```

### Scenario: Set up a repo that already has agent instructions

```
GIVEN a repo with its own AGENTS.md and CLAUDE.md
WHEN I run `npx loopboard init`
THEN the workflow block is appended to AGENTS.md below the existing text
AND CLAUDE.md is left as it is (SETUP.md asks the agent to import AGENTS.md)
AND no existing file is overwritten
```

### Scenario: Add the optional skills

```
GIVEN any repo
WHEN I run `npx loopboard init --with-extras`
THEN tdd, diagnose, improve-codebase-architecture and write-a-skill are
    added too
```

### Scenario: Run init again

```
GIVEN a repo set up with init
WHEN I run `npx loopboard init` again
THEN missing pieces are added and nothing else changes
AND with nothing missing it says "Nothing to do — the workflow is already
    set up."
```

### Scenario: A legacy ai/ harness is sent to upgrade-harness

```
GIVEN a repo whose harness lives in ai/
WHEN I run `npx loopboard init` (with or without --upgrade)
THEN it exits without writing and says to ask the agent to "upgrade my
    loopboard harness", which adapts paths and can move the root
```

### Scenario: Upgrade untouched files

```
GIVEN a repo set up with an older loopboard
WHEN I run `npx loopboard init --upgrade`
THEN shipped skills, READMEs and templates I never edited are replaced with
    the new versions, and new ones are added
AND files I edited are listed as "skipped (edited locally)" and left alone,
    unless I pass --force
AND the AGENTS.md block's text is refreshed while its migration marker stays
AND issues, projects, specs and architecture content are never touched
AND it points me to upgrade-harness to merge the skipped files and apply
    pending migrations
AND --dry-run prints the same report without writing
```
