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
| Upgrade untouched files | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): updated vs skipped (edited locally), `--dry-run` writes nothing. Block refresh, `--force` and `--upgrade` where there is nothing to upgrade in `tests/init.test.ts` |
| Set up a folder without code | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): a folder outside git with a space and an umlaut in its name — the files, the identity file, `next-id`, `check`, the board, its empty Specs entry and an issue created in it. The exact file list, `--name`, `--parent`, names with `:` and `#` read back, a second folder on the command line, a file that can't be written, a folder with an `issues/` of its own and the link walk in `tests/init.test.ts` and `tests/cli.test.ts` |
| A docs harness needs an id that can be one | 🟡 | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): a slug that starts with a digit, `--dry-run`, `--id`. The other rules, the registry's id (also through a symlinked path, and one that only counts up from `workspace`) and an id or alias taken at another path in `tests/init.test.ts` |
| Run init in a docs harness | 🟡 | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): a second run, `--kind docs` on a code harness, and a lost identity file. `--upgrade`, `--kind code` on a docs harness, a flag that disagrees with the identity file, and an identity file that is damaged, unreadable, without a usable id or an index node's in `tests/init.test.ts` |

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
AND in a folder that holds no harness, --upgrade is a first run: the block
    gets the latest migration marker and the next step is printed
```

### Scenario: Set up a folder without code

```
GIVEN a folder that holds no harness — it needn't be a git repository, and
    its name may have spaces or letters outside ASCII
WHEN I run `loopboard init --kind docs` there (or with the folder as a path)
THEN it gets .agents/harness.md, .agents/issues/ with its README, its three
    templates and _archive/, .agents/projects/ with its README and two
    templates, .agents/.loopboard/manifest.json, AGENTS.md and CLAUDE.md —
    and nothing else: no specs, architecture, rules, design or SETUP.md, no
    skills, and no links under .claude/ or .cursor/
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
    says to add the line `@AGENTS.md` — unless it is a link to AGENTS.md
AND a folder with an `issues/` folder of its own is taken as it is, unless
    issue files (`NNNN-slug.md`) are in it
AND `loopboard next-id`, `loopboard check` and the board work there; the
    Specs entry says the workspace has no specs
AND nothing is registered: the folder becomes a workspace when I open it
AND when one file of the plan can't be written — a read-only file or
    folder, a folder where a file belongs — the command says which and
    writes nothing
AND a second folder on the command line stops it: a path with spaces
    belongs in quotes
```

### Scenario: A docs harness needs an id that can be one

```
GIVEN a folder I set up with `loopboard init --kind docs`
WHEN its id is settled — what I pass as `--id`, else the workspace id if the
    folder is registered, else the folder's slug
THEN an id that breaks the pattern stops the command with one sentence that
    asks for `--id`: one that starts with a digit ("2026-taxes"), is one
    character or longer than 32, is a reserved word, or a folder name that
    leaves no slug — also when the folder is registered as `workspace` or
    `workspace-2`
AND so does an id that is the id or an alias of a workspace registered at
    another path; the sentence names that path
AND a folder registered through a symlinked path is known as itself
AND an `--id` or `--parent` that breaks the pattern is refused the same way
AND in every case nothing was written
AND only folders the board has opened are registered: two folders with the
    same name that are set up one after the other both get that id, so the
    next step says to open the folder
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
AND files I edited are left alone, and the command says how to see the
    shipped version — it names no skill
AND the identity file is never overwritten: a flag that disagrees with it
    stops the command, and so does a file without an id that can be one
AND `--kind code` there, or `--kind docs` in a folder that holds a code
    harness, stops with one sentence that says what was found, instead of
    mixing the two
AND `--dry-run` lists what would happen and writes nothing
AND the folder stays a docs harness when the identity file starts with a
    BOM or a blank line or has lost its `type` line: the manifest remembers
    the scaffold
AND when the file is gone, `loopboard init --kind docs` writes it again and
    every other run stops and says so; a file that can't be read, or one
    that says `kind: index`, stops every run
```
