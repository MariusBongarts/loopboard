---
id: 0062
title: Show which repos' harnesses are behind the latest migration
category: user-story
status: done
assignee: agent
project: 03-help-center
phase: 1
parent: 0061
labels: [ui, help, server]
created: 2026-10-05
---

## User story

As a **maintainer**, I want to see every registered repo's harness level next
to the latest migration, so that I know which repos to upgrade and what an
upgrade will change.

## Acceptance criteria

- [x] `GET /api/harness` returns version, package path, latest migration, the migration list (id, title, date) and per workspace its level (marker in AGENTS.md, none → M000), legacy `ai/` root and missing folder
- [x] Migration parsing lives in one server module that `init` uses too
- [x] `/help/upgrade` lists each workspace with a status: Up to date, N behind, No marker, Legacy `ai/` root, Folder missing
- [x] The migrations list shows each migration's id, title and date
- [x] Vitest on real temp repos for every level case; handler test for the route; e2e against the fixture repos; spec § 9, server architecture doc and glossary updated

## Notes

- PRD stories 12–13.
