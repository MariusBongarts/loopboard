---
id: 0037
title: Wrap loopboard in a Mac desktop app
category: user-story
status: backlog
assignee: agent
project: 01-open-source-launch
labels: [distribution]
created: 2026-10-04
---

## User story

As a **developer who prefers native apps**, I want **loopboard as a Mac app with a dock icon, recent workspaces and a native folder picker**, so that **I don't keep a terminal open for it**.

## Acceptance criteria

- [ ] A Tauri (or similar) shell starts the same local server and shows the client
- [ ] Signed and notarized; auto-update

## Out of scope

- Rewriting the server natively — the wrapper reuses the Node server

## Notes

- Deferred in the PRD: npx covers every OS without signing or notarization. Revisit when users ask for it.
