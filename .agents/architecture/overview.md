# Overview

loopboard is a Vue 3 single-page app plus a small HTTP API over the markdown
files in each registered repo's **root** folder (`.agents/`, or a legacy
`ai/`). There is no database: the files are the source of truth, git is the
history, and a per-user registry remembers which repos (workspaces) exist.

## Tech stack

- **Client**: Vue 3 (`<script setup>`), `vue-router`, `marked` for markdown,
  `vuedraggable` for the board, TipTap 3 (+ `@tiptap/markdown`) for rich
  editing. No store.
- **Shared**: [shared/](../../shared/) holds pure code both sides use
  (frontmatter line edits; [refs.ts](../../shared/refs.ts), the one matcher
  for a local `#NNNN` reference and a local issue-file link;
  [printable.ts](../../shared/printable.ts), which escapes file names before
  they reach a terminal or a prompt).
- **Server**: one Node request handler, mounted by the Vite dev plugin or by
  the CLI's own `node:http` server; `gray-matter` parses frontmatter. Node
  built-ins otherwise.
- **CLI**: `bin/loopboard.js` → `build/server/cli.js` (a Vite SSR build of
  [server/cli.ts](../../server/cli.ts)); the client builds to `build/client`.
- **Tests**: Vitest against temp directories; Playwright against a temp copy
  of [`tests/e2e/fixtures/workspace/`](../../tests/e2e/fixtures/workspace/)
  served on port 5199; [`cli.spec.ts`](../../tests/e2e/cli.spec.ts) runs the
  built binary (global setup runs `pnpm build:app`) against temp repos with
  their own config dir. Vitest loads [vite.config.ts](../../vite.config.ts)
  without the dev plugin and with a config dir in the temp folder, so a test
  run never writes to the user's registry (#0111). CI:
  [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).

## Data flow

```
npx loopboard ──▶ cli.ts ──▶ registry (~/.config/loopboard/workspaces.json)
                     └─▶ serve.ts (127.0.0.1) ──▶ handler.ts ◀── plugin.ts (pnpm dev)

browser ──GET /api/w/:ws/data──────────▶ handler.ts
   ▲                                       ├─ readAllIssues   (issues + _archive)
   │  { workspace, issues, projects,       ├─ readAllProjects (prd.md + wip.md digest)
   │    specs }                            └─ readAllSpecs    (NN-*.md + coverage)
drag / toggle ──PATCH /api/w/:ws/issues/:id──▶ mutateIssue (targeted line rewrite)
reorder ───────PATCH /api/w/:ws/columns/reorder──▶ priority 1..N across one column
```

The client loads a workspace, refetches whenever its event stream reports a
change (any `.md` under the root), applies its own changes optimistically,
and reloads from disk when a write fails.

## The root

```
<root>/
├─ issues/NNNN-slug.md      live issues
├─ issues/_archive/         closed issues (read-only on the board)
├─ projects/NN-slug/        prd.md + wip.md per project
└─ specs/NN-slug.md         user-facing specs with coverage tables
```

A workspace is registered by its repo path; the root is detected as
`.agents/`, then `ai/`, then the path itself
([ADR-0003](decisions/0003-dot-agents-root-with-detection.md)). The CLI
registers the folder it runs in; `pnpm dev` registers `BASE_PATH` (resolved
against this repo) or this repo — nothing else does, tests included
([ADR-0001](decisions/0001-npx-cli-with-a-local-server.md),
[ADR-0002](decisions/0002-workspace-registry-in-user-config.md)).
