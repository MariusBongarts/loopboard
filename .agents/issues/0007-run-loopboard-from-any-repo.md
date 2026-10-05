---
id: 0007
title: Run loopboard from any repo with npx
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 2
parent: 0003
labels: [cli, server]
created: 2026-10-04
---

## User story

As a **solo developer**, I want **to run `npx loopboard` (or `loopboard <path>`) in any repo and get the board in my browser**, so that **I don't have to clone the tracker or edit scripts per repo**.

## Acceptance criteria

- [x] The API handler is framework-free and mounted by both the Vite dev plugin and a production Node server
- [x] `loopboard [path]` serves the built client + API for that repo, defaulting to the current directory
- [x] Root detection: `.agents/issues`, then `ai/issues`; if neither exists, the CLI exits with a clear hint to run `loopboard init`
- [x] Binds 127.0.0.1; uses the next free port if the default is taken; opens the browser unless `--no-open`
- [x] Requests with a foreign `Host` and mutating requests with a foreign `Origin` are rejected (Vitest)
- [x] `pnpm pack` + `npx ./loopboard-*.tgz` works in a temp repo with an `.agents/` and one with an `ai/` root
- [x] `pnpm verify` passes

## Out of scope

- Remembering several repos — #0008
- File watching — #0010

## Notes

- PRD stories 1–4. Keep gray-matter/fs logic where it is; only the transport moves.

## Outcome

- `launch()` in `server/cli.ts` starts or hands off; unit-tested in `tests/cli.test.ts`; Host/Origin guard in `tests/handler.test.ts`.
- Verified by hand: `pnpm build && pnpm pack`, then `npx --package=<tgz> loopboard` in a temp `.agents/` repo (served at 127.0.0.1:5400), a second `ai/` repo (handed off), and a folder without a root (exit 1 with the init hint).
- URLs use `127.0.0.1`, not `localhost`: the server binds IPv4 loopback and Node's fetch resolves `localhost` to `::1`.
- Pulled the `files` allowlist forward from #0035 — without it npm honors `.gitignore` and drops `build/`.
