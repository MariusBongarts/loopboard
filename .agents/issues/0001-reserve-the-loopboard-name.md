---
id: 0001
title: Reserve the loopboard name on npm and GitHub
category: task
status: todo
assignee: human
priority: 1
project: 01-open-source-launch
phase: 1
labels: [oss]
created: 2026-10-04
---

## What needs to change

Claim `loopboard` before anyone else does: publish a `0.0.0` placeholder to
npm under the maintainer's account, and decide where the repo lives (personal
account or a `loopboard` org) and create it there, private for now.

## Why

The name shows up in every command, README line and setup prompt. It was free
on npm on 2026-10-04, and losing it later would mean renaming across the
codebase and docs.

## Acceptance criteria

- [ ] `npm view loopboard` shows the maintainer as owner
- [x] GitHub home for the repo is decided and created — [MariusBongarts/loopboard](https://github.com/MariusBongarts/loopboard), public from the first push
- [x] Decision noted in the project's `wip.md` activity log

## Out of scope

- Domain or landing page — no hosted site in this project
- Making the repo public — that is #0036

## Notes

- Human-assigned: needs the maintainer's npm and GitHub accounts.
