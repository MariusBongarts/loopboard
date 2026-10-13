---
id: 0076
title: Make the CLI callable everywhere
category: task
status: todo
assignee: agent
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

- [ ] Run without `build/`, the binary prints one sentence naming the build command and exits 1 — no stack trace
- [ ] The README and CONTRIBUTING say how to get `loopboard` on the PATH from a clone (build, then link globally), and that `npx loopboard` needs the published package
- [ ] An unknown flag exits 1 with one sentence that names it, and nothing is written; each command declares in one place which of its flags take a value
- [ ] Tests: `init --kind docs` creates nothing (#0078 makes the flag valid and takes that test over), and `renumber <old> --path <repo>` works without a new number
- [ ] A test runs every command that takes a target (`init`, `next-id`, `check`, `renumber`, opening the board) from a foreign working directory
- [ ] `--help` and spec § 1 cover running from a linked clone and the answer to an unknown flag; tests use their own config directory

## Out of scope

- Publishing to npm and the release pipeline — #0001, #0035, #0036; until then `npx loopboard` keeps failing outside a clone
- Listing and cleaning the workspace registry — #0099
- Changing `npx loopboard` in docs, skills and the scaffold — it is the right command once the package is published

## Review

The agent builds the slice above and hands over as `in-review`,
`assignee: human`. Two checks only work on the maintainer's machine:

- [ ] Commit and push the pending work, so a linked clone and a later release run the same code
- [ ] Link the clone, then run `loopboard --version` from another folder

## Notes

- A linked clone runs `build/`, not the sources: rebuild after pulling.
- Split in the review round: listing and forgetting registry entries is
  #0099. Together the two are the first step of the order decided for
  project 04.
- Do this before #0078: it adds `--kind`, `--id`, `--name` and `--parent` to
  the table of flags that take a value.
