---
id: 0036
title: Record the README demo and go public
category: task
status: todo
assignee: human
priority: 2
project: 01-open-source-launch
phase: 8
parent: 0035
labels: [oss, launch]
created: 2026-10-04
---

## What needs to change

- Record the hero GIF: an agent working through an issue while cards move
  live on the board. Done by an agent as a scripted, re-recordable demo
  (`pnpm demo`); the maintainer judges the result.
- Final pass on the launch gate: every other issue in this project is `done`
  or `wontfix`, and the ship gate in `wip.md` is complete.
- Make the repo public, publish 1.0, announce.

## Why

The PRD's launch gate: go public only after every phase ships.

## Acceptance criteria

- [x] README hero GIF in place
- [ ] All other project issues are `done`/`wontfix`; ship summary filled in
- [ ] Repo public; `npx loopboard` installs 1.0 from npm
- [ ] Announcement posted

## Out of scope

- Hosted demo site — #0038 (backlog)

## Notes

- Human-assigned: needs account access and marketing judgment.
- Demo (2026-10-05): `pnpm demo` films the real board while
  [`scripts/demo/`](../../scripts/demo/) edits a demo repo's issue files like
  an agent; light + dark GIFs in `docs/media/`, swapped by a `<picture>` in
  the README. Deterministic, so `.github/workflows/demo.yml` re-records on
  pushes to main and opens a `bot/readme-demo` PR only when the UI changed.
  For that PR the repo needs "Allow GitHub Actions to create pull requests"
  (Settings → Actions → General); otherwise the branch is pushed and you open
  it by hand. The workflow hasn't run yet (no remote).
- The repo is public since the first push (2026-10-05, personal account);
  `package.json` has `repository`, so npm resolves the README's GIF paths.
- Launch gate on 2026-10-05: still open — #0001 (todo), #0006, #0013, #0035,
  #0041 (in-review, you), project 02's UX overhaul (in progress), and the
  backlog ideas #0037/#0038 need moving out of the project or `wontfix` for
  "all issues done" to hold. Found and fixed on the way: #0059.
