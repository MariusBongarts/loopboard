# loopboard Architecture

> Index of architecture documents: *how loopboard is built* and *how we build
> it*. For *what it does*, see [`../specs/_specs.md`](../specs/_specs.md).

## Table of Contents

| Concern | Doc | Key code path |
|---|---|---|
| What runs where, data flow, the root layout | [overview.md](overview.md) | [vite.config.ts](../../vite.config.ts) |
| API endpoints and the file-system modules | [server.md](server.md) | [server/](../../server/) |
| Vue app: components, state, browser storage | [client.md](client.md) | [src/](../../src/) |
| CI, packaging and release | [release.md](release.md) | [.github/workflows/](../../.github/workflows/), [scripts/](../../scripts/) |
| The agentic workflow this repo uses on itself | [workflow.md](workflow.md) | [AGENTS.md](../../AGENTS.md), [.agents/skills/](../skills/) |

## Decisions (ADRs)

Format: [`grill-with-docs/ADR-FORMAT.md`](../skills/grill-with-docs/ADR-FORMAT.md).
Decisions 0001–0005 were locked in the
[open-source launch PRD](../projects/01-open-source-launch/prd.md) and are
not built yet; each names the issue that implements it. Decisions 0007 and
0008 fix the on-disk contract of
[harnesses across folders](../projects/04-harness-tree/prd.md) before it is
built; 0009 leaves views over a whole tree to other tools.

| # | Decision | Implemented by |
|---|---|---|
| [0001](decisions/0001-npx-cli-with-a-local-server.md) | Ship as an `npx` CLI that starts a local server, not a desktop app or hosted site | #0007 |
| [0002](decisions/0002-workspace-registry-in-user-config.md) | One server remembers many repos in a per-user registry | #0008 |
| [0003](decisions/0003-dot-agents-root-with-detection.md) | `.agents/` is the default root; `ai/` is detected for legacy repos | #0002, #0007 |
| [0004](decisions/0004-sequential-branch-aware-ids.md) | Keep sequential IDs; allocate them across all branches and worktrees | #0016–#0018 |
| [0005](decisions/0005-wysiwyg-with-block-splice.md) | WYSIWYG editing that only re-serializes the blocks you changed | #0025, #0026 |
| [0006](decisions/0006-remotion-renders-mp4s-ship.md) | Remotion renders the Help Center's videos; only the MP4s ship | #0064, #0065 |
| [0007](decisions/0007-identity-file-in-the-harness.md) | A harness carries its identity in `.agents/harness.md`; amends 0002 | #0078, #0079, #0080, #0103 |
| [0008](decisions/0008-harness-ids-and-qualified-references.md) | Harness ids are short lowercase words, and references carry them in front | #0078, #0079, #0082 |
| [0009](decisions/0009-views-over-a-tree-live-outside-loopboard.md) | Views over a tree of harnesses — index nodes, people, an Overview — live outside loopboard; amends 0007, 0008 | #0113 |

## How to update these docs

This is a **living index**, not a spec. When you change something
architectural, update the relevant doc in the same change:

- **No architectural shift** (bug fix, small refactor) — no doc update.
- **New endpoint, module or persisted state** — add it to the relevant doc's
  table; point at code with `[file](relative/path)`, don't restate it.
- **New top-level concern** — new doc plus a row in the table above.
- **New ADR** — write it under [decisions/](decisions/) and add a row above;
  when it ships, keep the row and note the issue that built it.
- **Moved or renamed code** — fix the link rather than letting it rot.

Discipline: keep each doc under ~150 lines; docs explain *why* and *where*,
code explains *what*; fix stale claims inline when you find them.
