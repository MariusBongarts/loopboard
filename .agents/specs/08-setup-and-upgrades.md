# 8. Setup and upgrades

> `loopboard init` puts the workflow into a repo; agents finish it from
> `.agents/SETUP.md`. `init --kind docs` sets up a folder without code —
> issues and projects only, no git needed
> ([ADR-0007](../architecture/decisions/0007-identity-file-in-the-harness.md)).
> Running harnesses take later workflow changes through `init --upgrade`
> (untouched files) and the upgrade-harness skill (merges and migrations,
> [MIGRATIONS.md](../../MIGRATIONS.md)).

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
| Set up a folder without code | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): a folder outside git with a space and an umlaut in its name — the files, the identity file, `next-id`, `check`, the board and an issue created in it. The exact file list, `--name`, `--parent`, a name with `:` and `#` and the link walk in `tests/init.test.ts` |
| A docs harness needs an id that can be one | 🟡 | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): a slug that starts with a digit, `--dry-run`, `--id`. The other rules, the registry's id and an id or alias taken at another path in `tests/init.test.ts` |
| Run init in a docs harness | 🟡 | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): a second run, and `--kind docs` on a code harness. `--upgrade`, `--kind code` on a docs harness and a flag that disagrees with the identity file in `tests/init.test.ts` |

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

### Scenario: Set up a folder without code

```
GIVEN a folder that holds no harness — it needn't be a git repository, and
    its name may have spaces or letters outside ASCII
WHEN I run `loopboard init --kind docs` there (or with the folder as a path)
THEN it gets .agents/harness.md, .agents/issues/ with its README, its three
    templates and _archive/, .agents/projects/ with its README and two
    templates, AGENTS.md and CLAUDE.md — and nothing else: no specs,
    architecture, rules, design or SETUP.md, no skills, and no links under
    .claude/ or .cursor/
AND the identity file says `schema: 1`, the id (the folder's slug), the name
    (the folder's name, quoted where YAML needs it), `kind: harness`,
    `type: docs`, `parent: null` and today's date, above a placeholder for
    one paragraph on what the folder is for; `--id`, `--name` and `--parent`
    set those three
AND AGENTS.md has no "Build & test" section, and its workflow block has the
    same markers and migration marker as a code harness's but no verify
    command, specs or skills: an issue is done when every acceptance
    criterion is ticked and the evidence is written in the issue
AND the READMEs and templates are worded for work that isn't code, write
    commands as `loopboard …`, and link to nothing the folder doesn't have
AND files that were already there are left alone; an AGENTS.md from before
    gets the block appended, and for a CLAUDE.md from before the command
    says to add the line `@AGENTS.md`
AND `loopboard next-id`, `loopboard check` and the board work there
AND nothing is registered: the folder becomes a workspace when I open it
```

### Scenario: A docs harness needs an id that can be one

```
GIVEN a folder I set up with `loopboard init --kind docs`
WHEN its id is settled — the workspace id if the folder is registered, else
    the folder's slug, else what I pass as `--id`
THEN an id that breaks the pattern stops the command with one sentence that
    asks for `--id`: one that starts with a digit ("2026-taxes"), is one
    character or longer than 32, is a reserved word, or a folder name that
    leaves no slug
AND so does an id that is the id or an alias of a workspace registered at
    another path; the sentence names that path
AND an `--id` or `--parent` that breaks the pattern is refused the same way
AND in every case nothing was written
```

### Scenario: Run init in a docs harness

```
GIVEN a folder whose .agents/harness.md says `type: docs`
WHEN I run `loopboard init` or `loopboard init --upgrade` there, with or
    without `--kind docs`
THEN missing pieces come from the docs scaffold, and with --upgrade the
    workflow block and the READMEs and templates I never edited are
    refreshed from it
AND no specs, skills, links or other parts of a code harness are added
AND the identity file is never overwritten: a flag that disagrees with it
    stops the command
AND `--kind code` there, or `--kind docs` in a folder that holds a code
    harness, stops with one sentence instead of mixing the two
AND `--dry-run` lists what would happen and writes nothing
```
