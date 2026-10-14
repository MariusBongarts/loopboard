---
id: 0113
title: Link into the board from other tools with stable URLs
category: user-story
status: todo
assignee: agent
project: 04-harness-tree
phase: 1
labels: [ui, workspaces, docs]
created: 2026-10-14
---

## User story

As a **person who builds their own view over several harnesses — a script,
a dashboard, a note with links**, I want **a documented URL for a
workspace, an issue and a project that opens the board right there**, so
that **my tool links into loopboard instead of copying it** (ADR-0009).

## Acceptance criteria

- [ ] Three URLs are documented as stable: `/w/<id>` (the workspace), `/w/<id>/issues/<NNNN>` (one issue, also an archived one) and a new `/w/<id>/projects/<slug>` that opens one project's board with the project selected; a project can also be addressed by number, `/w/<id>/projects/P04`
- [ ] Each URL works on a cold start — a new tab, no stored selection — and wins over the selection the browser remembers for that workspace
- [ ] An id that isn't registered, an issue or a project that doesn't exist, show one sentence in the board with a link to the workspace or to `/` — never a blank page and never a silent redirect
- [ ] `loopboard workspaces --json` — today `id`, `name`, `path` (the root, e.g. `…/.agents`) and `exists` — also lists the harness folder as `folder` and, while a board runs, its base URL as `url` (from `server.json` and `/api/health`), so a tool maps a folder to a link without reading the registry file. Existing keys keep their meaning
- [ ] The README's CLI section and Help → Reference gain "Link into loopboard": the three URLs, the JSON shape, and that the shape only grows
- [ ] Spec § 7 gains the scenarios; an e2e test opens each URL in a fresh context and checks the selected item; a Vitest test pins the JSON shape of `workspaces --json`

## Out of scope

- Links to a saved view or a filtered list — the query string already carries them; documenting it can follow
- Deep links to a heading inside a PRD or WIP
- An API for other tools to write through — they write files, like agents do
- Any view over a tree of harnesses — ADR-0009

## Notes

- Today `/w/:ws` and `/w/:ws/issues/:id` exist, and the cross-workspace view
  selects an item with `?item=i:0042`; a project has no URL of its own and
  opens through its tag or the rail.
- Once #0079 lands, `<id>` is the id from the identity file, so a link
  survives a moved folder; until then it is the registry's slug, which is
  why the JSON carries the path.
- The board's port can change between runs; a tool should take the base
  URL from `workspaces --json` instead of hard-coding one.
- Filed on 2026-10-14 with ADR-0009: it is what loopboard offers the tools
  that the views moved out of this project now live in.
