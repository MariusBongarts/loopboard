---
id: 0035
title: Automate npm releases and test the packed CLI on every OS
category: task
status: in-review
assignee: human
project: 01-open-source-launch
phase: 8
parent: 0011
labels: [ci, release]
created: 2026-10-04
---

## What needs to change

- A `files` allowlist so the package ships only the built client, server,
  CLI and scaffold sources.
- A CI job that packs the tarball and, on macOS, Linux and Windows, runs
  `npx <tarball> init` in a temp repo, then starts the server and hits
  `/api/w/:id/data`.
- Tag-driven publishing to npm (with provenance), plus a changelog.

## Why

The CLI is the product. A broken publish is the worst possible first
impression, and Windows path/symlink handling only shows up on Windows.

## Acceptance criteria

- [ ] `private: true` is removed and `repository`/`homepage` are set (deferred here from #0003) — `private` removed; `repository`/`homepage` wait for #0001
- [x] `npm pack` contains no tests, fixtures, `.agents/issues` or prototypes
- [ ] The smoke job passes on all three OSs — passes locally on macOS (`pnpm smoke`); CI runs after the first push
- [ ] Pushing a version tag publishes to npm with provenance and updates the changelog

## Out of scope

- Homebrew or other package managers

## Notes

- Needs the npm name from #0001 and a publish token configured by the maintainer.

## Outcome

- `scripts/smoke.mjs` (also guards the tarball's contents), CI runs it on all
  three OSs after build; `release.yml` publishes on `v*` tags with provenance
  and creates a GitHub release from the CHANGELOG; `prepublishOnly` rebuilds
  and verifies. `CHANGELOG.md` added.

## Review

Needs the maintainer: set `repository`/`homepage` once #0001 decides the
GitHub home, add the `NPM_TOKEN` secret, and confirm CI (incl. smoke) is green
on the first push. Then tag `v1.0.0` from #0036.
