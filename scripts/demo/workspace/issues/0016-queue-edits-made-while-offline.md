---
id: 0016
title: Queue edits made while offline
category: task
status: todo
assignee: agent
project: 02-offline-mode
phase: 2
priority: 1
labels: [sync]
created: {{today-7}}
---

## What needs to change

Keep edits made offline in a persistent queue and replay them in order when
the connection is back.

## Acceptance criteria

- [ ] Edits survive a reload while offline
- [ ] The queue replays in order on reconnect
- [ ] A failed replay retries with backoff
