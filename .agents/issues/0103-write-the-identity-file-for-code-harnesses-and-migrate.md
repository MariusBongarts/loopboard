---
id: 0103
title: Write the identity file for code harnesses and add it to existing ones
category: user-story
status: todo
assignee: agent
project: 04-harness-tree
phase: 1
parent: 0080
labels: [cli, setup, conventions]
created: 2026-10-13
---

## User story

As a **maintainer with running harnesses**, I want **`loopboard init` to
write the identity file for a code harness, and an upgrade to add it to the
harnesses I already have under the id they are known by**, so that **every
harness can be recognised after a move and nothing I bookmarked changes**.

## Acceptance criteria

- [ ] `loopboard init` writes `.agents/harness.md` for a new code harness (`kind: harness`, `type: code`, `parent: null`), with the same id rules and the same `--id`, `--name` and `--parent` as `--kind docs` (#0078), and never overwrites an existing file
- [ ] `MIGRATIONS.md` gains the next migration: an existing harness adds `.agents/harness.md` with the id it is registered under — `loopboard workspaces --json` (#0099) prints it; without the CLI it is the folder's slug
- [ ] The migration asks first (**Confirm first**) where that id breaks the pattern, isn't unique, or belongs to a shared git repository: there the id should be the project's name, not one machine's folder slug, and `parent` stays `null` unless it is true for everyone who clones the repo
- [ ] A harness whose issue root is `ai/` gets the file at `.agents/harness.md` all the same, as its own Apply step
- [ ] The marker in this repo's AGENTS.md and in both scaffold blocks (code and docs) moves to the new migration, and this repo gets its own identity file: `id: loopboard`, `name: loopboard`, `kind: harness`, `type: code`, `parent: null`
- [ ] `docs/folder-map.md` and Help → Reference describe `.agents/harness.md` field by field, and the folder map no longer says that git is what keeps the history — a harness may have none
- [ ] Spec § 8 gains the scenarios; tests cover `init` in an empty folder, a second run, and the new level in the harness table

## Out of scope

- Reading the file — #0079
- Docs harnesses — `init --kind docs` writes their file from the start (#0078)
- Changing an id that is already registered — #0080 covers the repair

## Notes

- PRD story 7. The migration belongs in this change, not a later one —
  AGENTS.md, rule "If you change the workflow conventions": the identity
  file is the one part of this project an existing harness has to act on.
- Why after #0080: once this repo carries an identity file, every worktree
  of it carries the same id. Without #0080 the dev server couldn't register
  a worktree any more.
- Also needs #0102: docs harnesses receive this migration through the
  upgrade-harness skill, which must leave them lean.
- An id written into a public repository is public; keep it generic. A
  registered id with a `-2` suffix is a sign the folder slug wasn't unique
  on this machine — ask instead of writing it into a shared file.
- #0078 left two places for this issue in `server/init.ts`: `--id`,
  `--name` and `--parent` are refused without `--kind docs`, and the "Next:"
  line takes a plan that holds the identity file for the docs scaffold.
