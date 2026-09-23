---
id: 0064
title: Add lorem endpoint
category: user-story
status: done
assignee: agent
project: 01-lorem-feature
phase: 1
labels: [api]
created: 2026-05-02
---

## User story

As a **user**, I want to **call `POST /lorem`**, so that **the server
records my thing**.

## Acceptance criteria

- [x] Endpoint accepts `{ value: string }`.
- [x] Returns `201` with the created ID.
- [x] Integration test covers happy path.

## Out of scope

- UI wiring — see [#0065](./0065-wire-lorem-endpoint-to-ui.md).
