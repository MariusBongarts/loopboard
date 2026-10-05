# Offline mode — WIP

> Last updated: {{today-1}}
> PRD: [./prd.md](./prd.md)
> Status: in-progress

## Current focus

Phase 2 — sync. [#0016](../../issues/0016-queue-edits-made-while-offline.md)
is next; #0017 builds on it.

## Phases

### Phase 1 — Read offline

Goal: every note opens without a connection.

- [x] [#0014 Cache notes in IndexedDB](../../issues/0014-cache-notes-in-indexeddb.md) — done
- [x] [#0015 Show an offline badge in the header](../../issues/0015-show-an-offline-badge.md) — done

### Phase 2 — Sync

Goal: edits made offline reach every device.

- [ ] [#0016 Queue edits made while offline](../../issues/0016-queue-edits-made-while-offline.md) — todo
- [ ] [#0017 Resolve conflicts when a device reconnects](../../issues/0017-resolve-conflicts-on-reconnect.md) — todo
- [ ] [#0018 Sync attachments in the background](../../issues/0018-sync-attachments-in-the-background.md) — todo
- [ ] [#0019 Decide how long offline edits are kept](../../issues/0019-decide-offline-retention.md) — todo (human)

## Activity log

### {{today-1}} — #0015

- Offline badge in the header, driven by the browser's online events.

### {{today-3}} — #0014

- Notes are cached in IndexedDB on first open; the editor reads from the
  cache before the network.
