---
id: 0014
title: Cache notes in IndexedDB
category: task
status: done
assignee: agent
project: 02-offline-mode
phase: 1
labels: [storage]
created: {{today-8}}
---

## What needs to change

Cache every opened note in IndexedDB and read from the cache first.

## Acceptance criteria

- [x] Notes open without a connection
- [x] The cache is cleared on sign-out
