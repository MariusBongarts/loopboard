# 1. Running loopboard

> `npx loopboard` starts a local server for the repo you're in
> ([ADR-0001](../architecture/decisions/0001-npx-cli-with-a-local-server.md)).
> Contributors run the same app from a clone with `pnpm dev`, or link the
> built CLI and call `loopboard` from any folder.

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Open the board for the repo I'm in | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts) runs the built binary: board opens at `/w/<id>`, title shows the repo. Browser auto-open not asserted (`--no-open`) |
| A second repo joins the running server | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): hand-off message, the second repo opens on the same port |
| A repo without a root explains what to do | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts) |
| Only this machine can use the server | 🟡 | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): a foreign Host gets 403. Origin check unit-tested in `tests/handler.test.ts` |
| Start the board from a clone | 🟡 | every e2e run starts this way (`pnpm exec vite`, BASE_PATH = the demo repo) |
| Point the board at another repo's root | 🟡 | the e2e server is pointed at a temp repo via BASE_PATH |
| Start a second board while the first is running | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): `--port` taken → the next one (same port finder as `pnpm dev`) |
| Run the CLI from a linked clone, in any folder | 🟡 | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): every command with the repo as a path, from another folder. `npm link` itself isn't run; `tests/cli.test.ts` starts the binary through a symlink |
| A clone that isn't built says what to run | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): a copy of the binary without `build/` |
| A flag the command doesn't know stops it | ✅ | [`cli.spec.ts`](../../tests/e2e/cli.spec.ts): `init --dry` and the board write nothing, `renumber <old> --path`, a missing value. Parsing in `tests/args.test.ts`, an unusable `--port` in `tests/cli.test.ts` |
| A malformed issue file does not break the board | ✅ | [`01-running-loopboard.spec.ts`](../../tests/e2e/01-running-loopboard.spec.ts): skipped on two consecutive loads (#0042) and counted in the rail (#0071) |
| A file that can't be read does not take the workspace down | 🟡 | [`02-rail-and-feed.spec.ts`](../../tests/e2e/02-rail-and-feed.spec.ts): a folder named like an issue stands in for the unreadable file. Permission errors and links that point nowhere in `tests/issues.test.ts`; the 200 response in `tests/handler.test.ts` |

### Scenario: Open the board for the repo I'm in

```
GIVEN a repo with an .agents/ (or legacy ai/) folder holding issues/
WHEN I run `npx loopboard` there (or `loopboard <path>`)
THEN a server starts on 127.0.0.1, port 5180 or the next free one
    (`--port <n>` picks the first port to try)
AND the repo is registered as a workspace (§ 7)
AND the browser opens at http://127.0.0.1:<port>/w/<workspace> unless I
    pass --no-open
AND the terminal prints the URL and the root it reads
```

### Scenario: A second repo joins the running server

```
GIVEN loopboard is already running for one repo
WHEN I run `npx loopboard` in another repo
THEN no second server starts
AND the running one registers the repo and the browser opens it
```

### Scenario: A repo without a root explains what to do

```
GIVEN a folder with neither .agents/issues nor ai/issues
WHEN I run `npx loopboard` there
THEN it exits with "No .agents/ (or legacy ai/) folder with issues/ in
    <path>" and suggests `npx loopboard init`
```

### Scenario: Only this machine can use the server

```
GIVEN loopboard is running
WHEN a request arrives with a Host other than localhost / 127.0.0.1 / [::1]
    on loopboard's port
THEN it is refused with 403
AND writes whose Origin isn't loopboard's own are refused with 403
```

### Scenario: Start the board from a clone

```
GIVEN a clone of the loopboard repo with dependencies installed
WHEN I run `pnpm dev`
THEN the dev server serves loopboard on http://localhost:5180
AND registers this repo's `.agents/` root as a workspace and opens it
```

### Scenario: Point the board at another repo's root

```
GIVEN another repo at `../other`
WHEN I run `BASE_PATH=../other pnpm dev` (the repo or its root folder)
THEN that repo is registered as a workspace and the board can open it
AND an absolute path works the same way
```

### Scenario: Start a second board while the first is running

```
GIVEN a board is already running on port 5180
WHEN I run `pnpm dev` again
THEN the new server takes the next free port (5181, then 5182, …)
AND prints its URL
```

### Scenario: Run the CLI from a linked clone, in any folder

```
GIVEN a clone of the loopboard repo, built with `pnpm build` and linked with
    `npm link`
WHEN I run `loopboard` in any other folder
THEN it runs the clone's build/ (not the sources: I build again after pulling)
AND every command takes the repo as a path, so the folder I'm in doesn't
    matter: `loopboard <path>`, `init <path>`, `next-id <issue|project> <path>`,
    `check <path>` and `renumber <old> [new] --path <path>`
AND nothing is written to the folder I'm in
AND `--help` names the two steps and says that `npx loopboard` needs the
    published package
```

### Scenario: A clone that isn't built says what to run

```
GIVEN a clone without build/
WHEN I run `loopboard` with any arguments
THEN it prints "loopboard isn't built yet: run `pnpm build` in <clone>, then
    try again." and exits with 1 — no stack trace
```

### Scenario: A flag the command doesn't know stops it

```
GIVEN any command, or opening the board
WHEN I pass a flag it doesn't take, like `loopboard init --dry`
THEN it exits with 1 and one sentence: "Unknown flag --dry: `loopboard init`
    takes --with-extras, --upgrade, --force, --dry-run, --kind, --id, --name,
    --parent."
AND nothing is written, registered or started
AND a flag with a value takes the next word or `--flag=value`, never a
    positional's place: `renumber 0042 --path ../repo` moves 0042 to the next
    free number
AND without its value it stops the same way: "Flag --path needs a value."
AND so does a port the board can't use (`--port abc`, `--port 70000`): the
    repo is not registered
AND `--help` after a command prints the help instead of running it
```

### Scenario: A malformed issue file does not break the board

```
GIVEN one issue file has invalid YAML frontmatter
WHEN the board loads
THEN every other issue still shows
AND the file is counted as skipped in the rail, with what the parser found
    wrong and where
    (§ 2)
AND the file stays out on every later load, not only the first
```

### Scenario: A file that can't be read does not take the workspace down

```
GIVEN an issue file the server can't read — no permission, a link that
    points nowhere, or a cloud placeholder that fails to download
WHEN the board loads
THEN the workspace opens with every other issue
AND the file is counted as skipped, with "can't be read (<error code>)"
```
