# Statuses and fields

| Status | Means |
|---|---|
| `backlog` | An idea, not scheduled. Lives in the Backlog drawer, not on the board. |
| `todo` | Ready to pick up. |
| `in-progress` | Being worked on. |
| `blocked` | Waiting on the issue in `parent:` or something external. |
| `in-review` | Built, waiting on a human check — always assigned to you. |
| `done` | Built and verified. |
| `wontfix` | Closed without doing it; the issue says why. |

| Field | Means |
|---|---|
| `assignee` | `agent` (default) or `human` — who's driving right now. |
| `project` / `phase` | Which project and phase the issue belongs to. |
| `parent` | The issue that must finish first. |
| `priority` | Order within a board column (1 = top); loopboard writes it when you drag. |
| `reviewed` / `deployed` | Optional dates recorded after `done`. |
| `source` | Where a report came from, e.g. `github#12`. |

The full format, with templates per category, is in
`.agents/issues/README.md`.
