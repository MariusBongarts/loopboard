---
id: 0078
title: Set up a harness without code with loopboard init --kind docs
category: user-story
status: todo
assignee: agent
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

- [ ] `loopboard init --kind docs [path]` creates exactly: `.agents/harness.md`, `.agents/issues/` with its README, its templates and `_archive/.gitkeep`, `.agents/projects/` with its README and templates, `.agents/.loopboard/manifest.json`, `AGENTS.md` and `CLAUDE.md`
- [ ] It creates no `specs/`, `architecture/`, `rules/`, `design/` or `SETUP.md`, copies no skills and creates no links under `.claude/` or `.cursor/`
- [ ] The identity file has `schema: 1`, `id`, `name` = the folder's name, `kind: harness`, `type: docs`, `parent: null`, `created` = today and a placeholder purpose paragraph; `--id`, `--name` and `--parent` override those three. `name` is written as a YAML-safe scalar — tested with a folder name that contains `:` and `#`
- [ ] The id is settled before anything is written: a folder that is already registered gets its workspace id, any other the folder's slug. `init` stops with one sentence asking for `--id` when the id breaks the pattern of the ADR (#0101), when the slug fell back to `workspace`, or when the id or an alias already belongs to a workspace registered at another path
- [ ] `--kind`, `--id`, `--name` and `--parent` take a value, and `init --kind docs` without a path sets up the current folder — a regression test, because today that command scaffolds a code harness into a new `docs/` folder
- [ ] The docs scaffold ships its own variants of the AGENTS.md skeleton (no "Build & test" section), the workflow block, `issues/README.md`, `projects/README.md` and the PRD template. They carry the same markers and migration marker as the code block, but no verify command, no specs or architecture step and no skill links: an issue is `done` when every acceptance criterion is ticked and the evidence (a file path, a reference, the date something was sent) is written in the issue; `in-review` keeps its meaning. Commands read `loopboard …`, with one line saying that `npx loopboard …` works once the package is published
- [ ] The docs variant of the issues README carries the "Reserved fields and references" section from #0101
- [ ] No file the docs scaffold creates links to a path it didn't create: a test walks every relative link in a freshly scaffolded docs folder
- [ ] It works in a folder that is not a git repository and whose name has spaces or non-ASCII letters; afterwards `loopboard next-id issue`, `loopboard check` and opening the board work there
- [ ] It never overwrites: a second run creates nothing, `--dry-run` only lists, and `--kind docs` on a folder that already holds a code harness stops with a sentence instead of mixing the two
- [ ] `init` and `init --upgrade` in an existing docs harness read `type: docs` from the identity file, with or without `--kind`: they refresh the block and the untouched READMEs and templates from the docs variants, and add no code seeds, skills or links
- [ ] Vitest on a temp folder outside git and a CLI e2e test; spec § 8 gains the scenarios; the README's CLI table and Help → Set up mention `--kind docs`

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
