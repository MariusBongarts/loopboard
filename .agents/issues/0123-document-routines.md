---
id: 0123
title: Document routines for users
category: task
status: done
assignee: agent
project: 05-routines
phase: 3
parent: 0119
labels: [docs, routines]
created: 2026-10-27
---

## What needs to change

A user guide for routines and their place in every list of what loopboard
does: `docs/routines.md` (files, fields, schedules in words, due, runs,
recurring issues, dispatcher setup, the `--json` shapes field by field),
the README's CLI table, `docs/folder-map.md`, the Help Center (Set up and
Reference) and the CHANGELOG.

## Why

The private dashboard and other people's tools read `list --json`; they need
the contract written down. And a feature that only exists in `--help` isn't
found.

## Acceptance criteria

- [x] `docs/routines.md` covers the format, the commands, the dispatcher with its three setups, and documents `list --json` and `due --json` (`version: 1`) field by field
- [x] The README's CLI table has a row per `routines` command; `docs/folder-map.md` shows `scheduled/`; Help → Reference renders the guide's overview; Help → Set up lists the commands
- [x] CHANGELOG `[Unreleased]` has a Routines section
- [x] A test keeps the documented JSON keys in step with what `list --json` prints

## Out of scope

- Videos or course chapters

## Notes

- PRD story 31 and decision 16.
