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
| Find files the board skips | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): warning per file, `--strict` fails, a mis-named file and folder keep their number. Unreadable files, a mis-named twin and escaped names in `tests/cli.test.ts`; stray files in `projects/` in `tests/ids.test.ts` |
| Renumber an issue | 🟡 | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): file, `id:`, next free number, `--path`. Reference rewriting and `--dry-run` in `tests/ids.test.ts` |
| Renumber one of two twins | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): refuses without `--file`, moves only the named file. A mis-named twin and a `--file` without the number in `tests/cli.test.ts` and `tests/ids.test.ts` |
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

### Scenario: Find files the board skips

```
GIVEN files the board reports as skipped (§ 2): invalid frontmatter, a name
    that isn't `NNNN-slug.md`, an unreadable file, a project folder not
    named `NN-slug`
WHEN I run `loopboard check`
THEN each is listed as a warning with the same path and reason as on the
    board, and the exit code stays 0
AND with --strict they fail the check
AND a mis-named file or folder still takes its number for `next-id`, so
    renaming it can't collide with a newer issue; a file in projects/ takes
    none
GIVEN a mis-named file that shares its number with another file, as a sync
    conflict copy (`0001-first 2.md`) does
WHEN I run `loopboard check`
THEN it is a duplicate as well: both files are listed, the exit code is 1,
    and the fix command names the mis-named file, quoted for the shell
AND a control character in a name is printed escaped (`\n`, `\u001b`),
    never sent to the terminal
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
AND a mis-named twin (`0001_first.md`) moves the same way and keeps the rest
    of its name (`0004_first.md`)
WHEN --file names a file that doesn't have that number
THEN nothing moves, and the files that do are listed
```

### Scenario: Renumber a project

```
WHEN I run `loopboard renumber 01 04`
THEN the folder 01-launch becomes 04-launch
AND every `project: 01-launch` and link into the folder is updated
```
