# 10. Issue and project numbers

> Numbers stay sequential and readable; the CLI keeps parallel agents from
> picking the same one ([ADR-0004](../architecture/decisions/0004-sequential-branch-aware-ids.md)).

## E2E coverage

CLI behavior: [`cli.spec.ts`](../../tests/e2e/cli.spec.ts) runs the built binary
against temp git repos; edge cases in `tests/ids.test.ts`. Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Get the next number | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts) (issue and project). Archive and no-git in `tests/ids.test.ts` |
| Numbers taken on other branches and worktrees count | 🟡 | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): unmerged branch. Worktrees and remote refs in `tests/ids.test.ts` |
| Find duplicate numbers | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): working tree and `--branches` |
| Find dangling references | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): warning, `--strict` fails. Code is skipped (`tests/ids.test.ts`) |
| Renumber an issue | 🟡 | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): file, `id:`, next free number, `--path`. Reference rewriting and `--dry-run` in `tests/ids.test.ts` |
| Renumber one of two twins | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): refuses without `--file`, moves only the named file |
| Renumber a project | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): folder, `project:` and links; `--dry-run` writes nothing |

### Scenario: Get the next number

```
GIVEN issues under <root>/issues/ and <root>/issues/_archive/
WHEN I run `loopboard next-id issue` (or `next-id project`)
THEN it prints the highest number in use plus one, zero-padded
    (0043, or 02 for projects)
AND outside a git repo it counts the folder only
```

### Scenario: Numbers taken on other branches and worktrees count

```
GIVEN #0007 exists only on an unmerged branch, #0011 only as an uncommitted
    file in another worktree, and #0020 only on a remote-tracking branch
WHEN I run `loopboard next-id issue` on main
THEN it prints 0021
```

### Scenario: Find duplicate numbers

```
GIVEN two different files numbered 0091 in the working tree
WHEN I run `loopboard check`
THEN it lists both files and the fix command, and exits with 1
GIVEN 0091 means one issue here and a different one on another branch
WHEN I run `loopboard check --branches`
THEN it reports that collision too; the same file on several branches is fine
```

### Scenario: Find dangling references

```
GIVEN an issue with `parent: 0042` or a mention of #0099 that no issue has
WHEN I run `loopboard check`
THEN each is listed as a warning and the exit code stays 0
AND with --strict they fail the check
AND mentions inside code (fenced blocks or `inline`) are examples, not
    references
```

### Scenario: Renumber an issue

```
WHEN I run `loopboard renumber 0001 0005`
THEN 0001-first.md becomes 0005-first.md with `id: 0005`
AND every #0001, `parent: 0001` and link to the file under the root points at
    0005; --dry-run lists the edits without making them
AND without a new number, the next free one is used
AND `--path <repo>` renumbers in another repo, with or without a new number
```

### Scenario: Renumber one of two twins

```
GIVEN two files numbered 0001
WHEN I run `loopboard renumber 0001` without --file
THEN it refuses and lists both files
WHEN I add `--file 0001-twin.md`
THEN only that file moves; links naming it are updated, and #0001 mentions
    elsewhere are listed as ambiguous and left alone
```

### Scenario: Renumber a project

```
WHEN I run `loopboard renumber 01 04`
THEN the folder 01-launch becomes 04-launch
AND every `project: 01-launch` and link into the folder is updated
```
