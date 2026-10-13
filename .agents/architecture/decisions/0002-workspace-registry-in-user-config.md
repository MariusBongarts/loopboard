# One server remembers many repos in a per-user registry

- **Status**: accepted — built in #0008, #0009; amended by [ADR-0007](0007-identity-file-in-the-harness.md), not built yet: a workspace's id and name come from the harness
- **Date**: 2026-10-04

The maintainer runs loopboard against many repos; today that is one dev
script and one port per repo. One running server will hold a list of
**workspaces** in a per-user config file (XDG config dir, `%APPDATA%` on
Windows) — `{ id, name, repoPath, root }` — and switch between them from the
top-left of the UI. Running the CLI in a repo registers it and selects it;
API routes and URLs carry the workspace id. Per-workspace UI state and saved
views live in the same user config, never in the repo, because they are
personal.

## Considered options

- **One server per repo** — simplest server, but users juggle ports and tabs
  and nothing remembers a repo they haven't started today.
- **Auto-discovery** (scan `~/repos` for `issues/` folders) — no manual step,
  but slow and surprising for an open-source tool to crawl the home folder.
