# Contributing

Thanks for helping! loopboard plans its own work with the workflow it ships,
so contributions follow the same loop.

## Report a bug or request a feature

Open a [GitHub Issue](../../issues/new/choose) with the bug or feature form.
You don't need to learn the `.agents/` file format; plain words are fine.

## How a report becomes work

1. The maintainer triages the GitHub Issue.
2. An accepted report becomes an issue file in
   [`.agents/issues/`](.agents/issues/) with `source: github#<number>` (or
   part of a project PRD in [`.agents/projects/`](.agents/projects/) when it
   needs several decisions). The GitHub Issue links to it.
3. Whoever implements it — human or agent — follows the session loop in
   [`AGENTS.md`](AGENTS.md): flip to `in-progress`, build a vertical slice,
   run `pnpm verify`, flip to `in-review`.
4. The PR title references the issue (`Fix crash on empty wip.md (#0091)`)
   and its description closes the GitHub Issue (`Closes #12`).

Please don't add new files under `.agents/issues/` in a PR without an
accepted GitHub Issue: issue numbers are sequential, and parallel PRs would
collide.

## Develop

```bash
pnpm install
pnpm dev      # board for this repo's .agents/
pnpm verify   # type-check + tests — must pass before a PR
pnpm test:e2e # Playwright: the board and the built CLI, against temp copies
pnpm demo     # re-record the README demo GIFs into docs/media/
```

`pnpm dev` registers your clone as a workspace in your user config
(`loopboard workspaces` lists them). Tests and the type-check never write
there: Vitest runs without the dev server's API and with a config directory in
the temp folder. To keep the dev server's registry apart as well, for example
in a second worktree, set `LOOPBOARD_CONFIG_DIR=<folder>`.

The README demo is scripted ([`scripts/demo/`](scripts/demo/)): Playwright
films the real board while the script edits a demo repo's issue files like an
agent would. CI re-records it on every push to main that touches the UI and
opens a pull request when the GIFs changed, so you only run `pnpm demo` to
preview a change to the storyboard.

Conventions: [`AGENTS.md`](AGENTS.md) (coding rules, session loop),
[`.agents/issues/README.md`](.agents/issues/README.md) (issue format and
statuses), [`.agents/projects/README.md`](.agents/projects/README.md) (PRDs).

### Run your clone as `loopboard`

`npx loopboard` needs the published package, so it never runs your changes. To
get your clone on the PATH, build it and link it globally:

```bash
pnpm build           # the CLI runs build/, not the sources
npm link             # puts `loopboard` on your PATH
loopboard --version  # works from any folder
```

The link runs `build/`: build again after pulling or changing code (without
`build/` the command says so). `npm uninstall -g loopboard` removes the link.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
