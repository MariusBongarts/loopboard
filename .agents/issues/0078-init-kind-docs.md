---
id: 0078
title: Set up a harness without code with loopboard init --kind docs
category: user-story
status: in-review
assignee: human
project: 04-harness-tree
phase: 1
parent: 0077
labels: [cli, setup]
created: 2026-10-13
---

## User story

As a **person organising work that isn't code — a company's paperwork, taxes,
a wedding — in a plain, cloud-synced folder**, I want **`loopboard init --kind
docs` to set up issues and projects without specs, a verify command, skill
copies or symlinks**, so that **I get a board for that folder without deleting
half the scaffold first**.

## Acceptance criteria

- [x] `loopboard init --kind docs [path]` creates exactly: `.agents/harness.md`, `.agents/issues/` with its README, its templates and `_archive/.gitkeep`, `.agents/projects/` with its README and templates, `.agents/.loopboard/manifest.json`, `AGENTS.md` and `CLAUDE.md`
- [x] It creates no `specs/`, `architecture/`, `rules/`, `design/` or `SETUP.md`, copies no skills and creates no links under `.claude/` or `.cursor/`
- [x] The identity file has `schema: 1`, `id`, `name` = the folder's name, `kind: harness`, `type: docs`, `parent: null`, `created` = today and a placeholder purpose paragraph; `--id`, `--name` and `--parent` override those three. `name` is written as a YAML-safe scalar — tested with a folder name that contains `:` and `#`
- [x] The id is settled before anything is written: a folder that is already registered gets its workspace id, any other the folder's slug. `init` stops with one sentence asking for `--id` when the id breaks the pattern of the ADR (#0101), when the slug fell back to `workspace`, or when the id or an alias already belongs to a workspace registered at another path
- [x] `--kind`, `--id`, `--name` and `--parent` take a value, and `init --kind docs` without a path sets up the current folder — a regression test, because today that command scaffolds a code harness into a new `docs/` folder
- [x] The docs scaffold ships its own variants of the AGENTS.md skeleton (no "Build & test" section), the workflow block, `issues/README.md`, `projects/README.md` and the PRD template. They carry the same markers and migration marker as the code block, but no verify command, no specs or architecture step and no skill links: an issue is `done` when every acceptance criterion is ticked and the evidence (a file path, a reference, the date something was sent) is written in the issue; `in-review` keeps its meaning. Commands read `loopboard …`, with one line saying that `npx loopboard …` works once the package is published
- [x] The docs variant of the issues README carries the "Reserved fields and references" section from #0101
- [x] No file the docs scaffold creates links to a path it didn't create: a test walks every relative link in a freshly scaffolded docs folder
- [x] It works in a folder that is not a git repository and whose name has spaces or non-ASCII letters; afterwards `loopboard next-id issue`, `loopboard check` and opening the board work there
- [x] It never overwrites: a second run creates nothing, `--dry-run` only lists, and `--kind docs` on a folder that already holds a code harness stops with a sentence instead of mixing the two
- [x] `init` and `init --upgrade` in an existing docs harness read `type: docs` from the identity file, with or without `--kind`: they refresh the block and the untouched READMEs and templates from the docs variants, and add no code seeds, skills or links
- [x] Vitest on a temp folder outside git and a CLI e2e test; spec § 8 gains the scenarios; the README's CLI table and Help → Set up mention `--kind docs`

## Outcome

- `loopboard init --kind docs [path]` writes twelve files and no link: the
  identity file, the issues README with three templates and
  `_archive/.gitkeep`, the projects README with two templates, the manifest,
  `AGENTS.md` and `CLAUDE.md`. It registers nothing and never asks git.
- Its sources are in `scaffold/docs/`: a workflow block, an AGENTS.md
  skeleton, both READMEs and all five templates. The criteria name the PRD
  template only; the code issue templates ask for a regression test and the
  code WIP template for spec updates, so the docs scaffold got its own.
- The id is settled first, in `server/init.ts`: `--id`, else the folder's
  workspace id, else its slug. `server/identity.ts` holds the pattern, the
  fifteen reserved words, the file's writer and a reader that takes `id`,
  `type`, `parent` and `aliases` from their raw lines; #0079 builds on it.
  To know what is taken, `init` reads the registry and the identity file of
  every workspace in it.
- A folder that holds a harness keeps its kind. With `type: docs` in the
  identity file, `init` and `init --upgrade` plan from the docs scaffold,
  with or without the flag. `--kind docs` on a code harness stops, and so
  does `--kind code` on a docs harness.
- The identity file is written once: a flag that names another id, name or
  parent than the file holds stops the command.
- Refused with one sentence until their issues land: `--kind index` (#0104),
  and `--id`, `--name` or `--parent` without `--kind docs` (#0103). Also
  refused: `--with-extras` with `--kind docs`.
- Beyond the criteria: where a `CLAUDE.md` was there before, the "Next:"
  line says to add `@AGENTS.md` to it — the docs scaffold has no SETUP.md to
  say so. The README and the changelog have a paragraph each, the glossary
  has "Docs harness", and AGENTS.md says that a change to the conventions
  has to reach the docs block too.
- No migration: an existing harness has nothing to do.
- Tests: `tests/init.test.ts` "loopboard init --kind docs" on temp folders
  outside git, `tests/cli.test.ts` "init --kind docs" through the CLI's
  entry point, and two scenarios in `tests/e2e/cli.spec.ts`.
- By hand, with the built CLI: three folders — one with a space and an
  umlaut in its name, one nested inside it, one that already held a README,
  a `CLAUDE.md`, a PDF and a subfolder. Each got the scaffold and no link,
  the files from before kept their hashes, and each opened on the board,
  took an issue through the API and showed it in the feed and on the board.

## Review

Verify passes and every criterion is met. What is left needs a sync client,
which no test has:

- [ ] Run `loopboard init --kind docs` in a real cloud-synced folder: all twelve files arrive on a second device, `.agents/.loopboard/manifest.json` and the empty `_archive/.gitkeep` included
- [ ] The board opens on the second device
- [ ] A status change made from the board arrives on the other device without a conflict copy or a leftover `.tmp` file
- [x] The two new scenarios in `cli.spec.ts` pass — that file was run on its own, 17 of 17. The full e2e suite was not run in this session

## Out of scope

- Reading the identity file in the registry — #0079; until then `init` is the only reader, for `type`
- Keeping a docs harness lean when the upgrade-harness skill runs, and Help → Upgrade for harnesses without skills — #0102
- Skills for a docs harness — the default is none; how a docs harness gets skills (a shared, user-level folder or copies) is deferred in `wip.md`
- Hiding code-only parts of the board (the Specs entry, git history) for docs harnesses — deferred in `wip.md`
- Reporting conflict copies and recovering the watcher on synced folders — #0071, #0072

## Notes

- PRD stories 9–11. This is the one project-04 feature that has to exist
  before a tree of harnesses is created; see "Before the tree" in the WIP.
- Needs #0077 first: the id is the folder's slug and never changes, so a
  folder with an umlaut in its name must get a readable one. Also needs
  #0101, whose ADR fixes the id pattern and the flag's name, and #0076,
  which makes the CLI refuse flags it doesn't know and declares which flags
  take a value.
- What #0101 decided for this issue, on 2026-10-13: an id matches
  `^[a-z][a-z0-9-]{0,30}[a-z0-9]$` and is not one of the reserved words
  listed in ADR-0008; the flag stays `--kind` and maps onto the file's
  `kind` and `type` as the table in ADR-0007 says. #0101's two open
  questions — a shared repository's file, worktrees — don't concern a docs
  harness.
- Today's `init` creates 28 files plus a manifest, and 8 symlinks, in an
  empty folder — the eight core skills, four code seed folders and a
  `SETUP.md` that asks for a verify command. The copy fallback for skill
  links only runs when creating a symlink throws, not when a sync client
  drops the link afterwards.
- Today the READMEs and templates are copied from this repo's own `.agents/`.
  They link to skills, specs and architecture docs, say a project produces
  spec updates and shipped code, and define `done` by the verify command —
  none of which a docs harness has. The docs variants need their own source,
  for example a `docs` folder in the scaffold.
- The identity file's fields are the contract in the PRD ("The contract").
  `--kind code` stays the default and behaves as today.
- `_archive/.gitkeep` is kept although there is no git: it is harmless on a
  synced folder and keeps the folder if the harness is ever put under git.
- No sync client runs in CI. When verify passes, hand the issue to the
  maintainer (`in-review`, `## Review`) for one run in a real synced folder:
  the scaffold arrives complete on a second device, the board opens there,
  and a status change made from the board arrives on the second device
  without a conflict copy or a leftover `.tmp` file — the server writes
  through a temp file and a rename, which no test covers on a sync client.
- The wording of the docs block, the READMEs and the templates is a first
  draft for work that isn't code; it is shipped text, so later changes need
  no migration.
- The link walk leaves out a template's placeholder link — the WIP
  template's `../../issues/NNNN-issue-slug.md` names a file to come.
- Until #0079 the registry doesn't read the file: a folder set up with an
  `--id` that differs from its slug still opens under the slug, and gets the
  file's id once #0079 lands.
- A docs harness that lost its identity file is a code harness to `init`
  (ADR-0007: without the file a harness behaves as before). `--kind docs`
  stops there, and a plain `init` would add the code scaffold; put the file
  back first.
- Found on the way, not changed: a folder with an `issues/` folder of its
  own counts as a harness that lives at its top (ADR-0003), so `init` sends
  it to upgrade-harness; and a project created from the board gets a
  "Current focus" that names the grill-me skill. Both are in the WIP's
  deferred list.
