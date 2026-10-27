---
id: 0125
title: writes-to warns about a harness that is registered under another workspace id
category: bug
status: todo
assignee: agent
project: 05-routines
phase: 4
labels: [routines, check]
created: 2026-10-27
---

## Steps to reproduce

1. Register `~/repos/webhighlights` on a machine where the registry gave it
   the workspace id `webhighlights-2` (name `webhighlights`), and give the
   repo no `.agents/harness.md`.
2. In another harness, write a routine with `writes-to: [webhighlights]`.
3. Run `loopboard check` there.

## Current behavior

`! scheduled/<slug>/routine.md: writes-to "webhighlights" is no registered
harness here`. `workspaceNames()` (`server/workspaces.ts`) only collects the
workspace id, the identity file's id and its aliases — not the workspace's
name or its folder's slug. Meanwhile `routines list` and `due` name the same
harness `webhighlights` (`harnessFor()` falls back to the folder's slug), so
the two disagree. Seen on 2026-10-27 in the prodapps session that set up the
routine `email-check`.

## Expected behavior

A harness counts as known by every name loopboard itself shows for it: the
identity file's id and aliases, the workspace id, and — for a workspace
without an identity file — its folder's slug, the id `routines list`
reports. When none matches, the warning says how to fix it: give that
harness an identity file (`.agents/harness.md`) with the id.

## Acceptance criteria

- [ ] `writes-to: [webhighlights]` is known when the registered workspace's folder slugs to `webhighlights`, whatever its workspace id
- [ ] The warning names the fix: "… no registered harness here — register it, or give it an identity file with that id"
- [ ] Vitest: a registry entry `webhighlights-2` without an identity file; one with an identity file whose id differs from the slug (only the identity id and aliases count then, as in `harnessFor()`)

## Out of scope

- Reading ids from identity files in the registry itself (#0079)

## Notes

- One rule for both: `harnessFor()` in `server/routines.ts` and
  `workspaceNames()` should share the "identity id, else the folder's slug"
  step, so `check` and `list` can't disagree again.
