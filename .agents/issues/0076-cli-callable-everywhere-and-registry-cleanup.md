---
id: 0076
title: Make the CLI callable everywhere
category: task
status: in-review
assignee: human
labels: [cli]
created: 2026-10-13
---

## What needs to change

The CLI is only usable inside a clone of this repo, and it guesses where it
should refuse.

**It only runs inside a clone.** The README, the scaffold and the skills
say `npx loopboard …`, but the package isn't on npm yet (#0001, #0035;
`npm view loopboard` answered 404 on 2026-10-13), so that command fails
everywhere. What works is `node bin/loopboard.js` from this repo. From
another folder there is no `loopboard` on the PATH, and when `build/` is
missing the binary dies with a raw `ERR_MODULE_NOT_FOUND` stack instead of
saying what to do.

**A flag it doesn't know is read as a path.**
`loopboard renumber 0042 --path ../repo` takes the path for the new number
and stops with "the new number must have 4 digits"; `--path` only works when
the new number is given too. And `loopboard init --kind docs` — the command
project 04 is going to add — today ignores `--kind`, takes `docs` for the
target and scaffolds a full code harness, skills and eight symlinks included,
into a new `docs/` folder.

Make the CLI usable from any folder without the published package, and make
it refuse what it doesn't understand.

## Why

Project 04 puts harnesses in many folders, most of them outside this repo,
and its agents call `loopboard next-id`, `check` and later `where` and
`resolve` from wherever they work. That has to work before a tree of
harnesses is created. What makes `npx loopboard` itself work is publishing
the package — the maintainer's step, part of the launch (#0001, #0035,
#0036).

## Acceptance criteria

- [x] Run without `build/`, the binary prints one sentence naming the build command and exits 1 — no stack trace
- [x] The README and CONTRIBUTING say how to get `loopboard` on the PATH from a clone (build, then link globally), and that `npx loopboard` needs the published package
- [x] An unknown flag exits 1 with one sentence that names it, and nothing is written; each command declares in one place which of its flags take a value
- [x] Tests: `init --kind docs` creates nothing (#0078 makes the flag valid and takes that test over), and `renumber <old> --path <repo>` works without a new number
- [x] A test runs every command that takes a target (`init`, `next-id`, `check`, `renumber`, opening the board) from a foreign working directory
- [x] `--help` and spec § 1 cover running from a linked clone and the answer to an unknown flag; tests use their own config directory

## Out of scope

- Publishing to npm and the release pipeline — #0001, #0035, #0036; until then `npx loopboard` keeps failing outside a clone
- Listing and cleaning the workspace registry — #0099
- Changing `npx loopboard` in docs, skills and the scaffold — it is the right command once the package is published

## Outcome

- `bin/loopboard.js` looks for `build/server/cli.js` before importing it and
  otherwise prints "loopboard isn't built yet: run `pnpm build` in <clone>,
  then try again." (exit 1).
- Every entry of the command table declares its `usage` line and its `flags`
  (`switch` or `value`), and so does opening the board. `server/args.ts`
  parses against that declaration before the command runs: an unknown flag or
  a missing value is one sentence and exit 1. `--flag=value` works, and
  `--help` after a command prints the help instead of running it.
- `renumber <old> --path <repo>` no longer takes the path for the new number.
- Linking is `pnpm build && npm link`: pnpm 11's `link` has no global mode.
  Tried against a temporary npm prefix — the link resolves to the clone's
  `build/`, and `npm uninstall -g loopboard` removes it again.
- Left as it is: a value the CLI can't use (`--port abc`) still fails inside
  the command, after the repo was registered.

## Review

Verify is green and every criterion above is met. What is left only works on
the maintainer's machine or in the full e2e run:

- [ ] Merge and push this slice, so a linked clone and a later release run the same code
- [ ] Link the clone (`pnpm build && npm link`), then run `loopboard --version` from another folder
- [ ] `pnpm test:e2e` passes with the three new scenarios in `cli.spec.ts` — they were not run through Playwright in this session; their bodies passed against the built binary

## Notes

- A linked clone runs `build/`, not the sources: rebuild after pulling.
- Split in the review round: listing and forgetting registry entries is
  #0099. Together the two are the first step of the order decided for
  project 04.
- Do this before #0078: it adds `--kind`, `--id`, `--name` and `--parent` to
  the table of flags that take a value.
