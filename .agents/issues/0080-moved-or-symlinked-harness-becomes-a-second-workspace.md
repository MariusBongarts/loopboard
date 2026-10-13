---
id: 0080
title: A moved or symlinked harness shows up as a second workspace
category: bug
status: todo
assignee: agent
project: 04-harness-tree
phase: 1
parent: 0079
labels: [server, workspaces]
created: 2026-10-13
---

## Steps to reproduce

1. Register a harness at `~/work/shop`.
2. Register the same folder again through a symlink, e.g. `~/links/shop`.
3. Separately: move a registered harness to another folder (or move its root
   from `ai/` to `.agents/`), then open loopboard and register the new
   location.

## Current behavior

- Step 2 creates a second workspace under the symlink's name. Both show the
  same issues, and the cross-workspace "Needs you" lists each item twice.
  Registration compares path strings, not real paths.
- Step 3 leaves the old entry behind as "folder missing" and adds the new
  location under a new id (`shop-2`). The workspace's URL, its saved views
  and its pins and selection in the browser all hang on the old id, so they
  are gone. On a synced folder this is routine: the same folder is reachable
  through the sync client's real path and through a shortcut to it.

## Expected behavior

One harness is one workspace. Reaching it another way re-selects it; moving
it keeps its id and everything keyed by it. A second checkout of the same
repo still opens.

## Acceptance criteria (verification)

- [ ] Registration compares real paths: a symlinked path to a registered harness re-selects that workspace and adds no entry
- [ ] A harness whose identity file carries a registered id, found at a new path while the old path no longer exists, updates the entry in place — same id, same URL, saved views intact
- [ ] A git worktree or second clone of a registered harness — same id, both paths exist, the new one is a git checkout — is not refused: it opens as a secondary checkout of that harness under a machine-local key such as `<id>~2`, labelled with its branch or folder. References, cross-workspace lists and later the Overview resolve to the primary checkout, and a secondary one whose folder is gone is not kept as "folder missing"
- [ ] A plain copy outside git, with both paths present, is refused with a sentence naming both folders and saying to open the original or give the copy its own id; nothing is overwritten
- [ ] When a registered harness's identity file names a different id than the registry, the registry adopts the file's id and the workspace's saved views move with it
- [ ] A harness without an identity file still gets real-path deduplication; following a move needs the file, and the "folder missing" state says so
- [ ] Regression tests on real temp folders cover the symlink, the move, the copy, the changed id and a real `git worktree add` — including the dev server's own registration when it is started from that worktree
- [ ] Spec § 7: "A workspace whose folder disappeared" is updated, and the move, the symlink and the second checkout get scenarios

## Out of scope

- Finding moved harnesses by scanning — running `loopboard add --tree` again does that (#0095)
- Cleaning entries that are already stale — `loopboard workspaces forget` (#0099)
- Paths that differ only in Unicode normalisation — real-path comparison covers what the file system reports as the same
- A lasting redirect from an old id, and moving pins and the last selection in the browser to the new one — an id is meant never to change, so a changed id is a repair; deferred in `wip.md`

## Notes

- PRD stories 2, 3, 8. The identity file from #0079 is what makes a move
  detectable: without it loopboard only knows a path.
- Why worktrees can't be refused: the identity file is committed, so every
  worktree and every second clone carries the same id, and "give the copy
  its own id" would mean editing a tracked file. Parallel agents in
  worktrees are a core case (ADR-0004), and `pnpm dev` registers the
  checkout it runs in. Today each checkout gets a workspace of its own.
- The secondary checkout is the answer #0101 proposes for its question 6;
  adjust the criterion if the maintainer decides otherwise.
- Deduplicate before assigning an id — otherwise the symlink's folder name
  produces a new slug first.
