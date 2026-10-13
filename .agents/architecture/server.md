# Server

One framework-free request handler ([server/handler.ts](../../server/handler.ts))
serves the API in both hosts: the Vite dev plugin
([server/plugin.ts](../../server/plugin.ts)) and the CLI's production server
([server/serve.ts](../../server/serve.ts)), which also serves the built client
with an `index.html` fallback for client routes. File-system logic sits in
deep modules that take an absolute root, so tests point them at temp dirs.

## Endpoints

Repo data lives under `/api/w/:workspace`; everything else is global.

| Method + path | Body | Effect |
|---|---|---|
| `GET /api/health` | — | `{ name: "loopboard", version, pid }` — the CLI uses it to find a running server |
| `GET /api/harness` | — | The Help Center's upgrade guide: `version`, `packagePath`, `latest` migration, `migrations` (id, title, date) and per workspace its harness level and status |
| `GET /api/workspaces` | — | Registered workspaces with `available` and `issueCount`, plus `lastUsed` |
| `POST /api/workspaces` | `{ path }` | Detects the root and registers the repo (201); 422 without a root |
| `PATCH /api/workspaces/:id` | `{ name }` | Renames |
| `DELETE /api/workspaces/:id` | — | Forgets the workspace; files untouched |
| `GET /api/fs/suggest?path=` | — | Sub-folder names under the typed path, flagged `hasRoot` — names only, never contents |
| `GET /api/w/:id/data` | — | `{ workspace, issues, projects, specs, skipped }`; `skipped` is `[{ file, reason }]` for every file the reader couldn't show; marks the workspace last used |
| `GET /api/w/:id/events` | — | Server-Sent Events: `change` after `.md` files under the root change (debounced); `ready` on connect and whenever the root is watched again, `stale` instead while its watcher is down |
| `GET /api/w/:id/issues/:issue/activity?archived=` | — | Local git: commits mentioning `#NNNN`, branches named after it, the file's history with status changes |
| `GET` / `PUT /api/w/:id/views` | `{ views }` on PUT | Saved list views for the workspace, kept in the user config |
| `GET /api/w/:id/doc?path=` | — | `{ path, content, hash }` for a markdown file under the root |
| `PUT /api/w/:id/doc` | `{ path, content, baseHash }` | Atomic write when `baseHash` matches the disk; else 409 with `current` |
| `GET /api/needs-you` | — | Per workspace: live issues assigned to human and not closed, plus blocked ones |
| `POST /api/w/:id/issues` | `{ title, category, status?, assignee?, project?, labels? }` | Next free number, the category template's body, YAML-safe frontmatter (201) |
| `POST /api/w/:id/projects` | `{ title }` | `NN-slug/prd.md` + `wip.md` from the templates (201) |
| `PATCH /api/w/:id/issues/:issue?archived=<bool>` | `{ status?, assignee?, priority?, reason?, reviewed?, deployed? }` | Rewrites those frontmatter lines; `null` removes a marker |
| `PATCH /api/w/:id/columns/reorder?archived=<bool>` | `{ status, ids }` | Writes `priority: 1..N`; 400 unless `ids` equals the column on disk |

Errors are `{ error }` with the thrown status (400 validation, 403 guard,
404 unknown, 422 no root / no frontmatter, 500 otherwise); only 5xx are
logged.

## Modules

| Module | Responsibility |
|---|---|
| [handler.ts](../../server/handler.ts) | Route table, JSON helpers, workspace lookup, the security guard on every request |
| [security.ts](../../server/security.ts) | Loopback-only `Host`, same-origin writes ([ADR-0001](decisions/0001-npx-cli-with-a-local-server.md)) |
| [workspaces.ts](../../server/workspaces.ts) | Root detection (`.agents` → `ai` → the path itself), the registry file, rename/remove, availability ([ADR-0002](decisions/0002-workspace-registry-in-user-config.md), [ADR-0003](decisions/0003-dot-agents-root-with-detection.md)). `loopboard workspaces` lists and forgets through the same functions as the API, reading and writing the file itself — no server involved (#0099) |
| [paths.ts](../../server/paths.ts) | Package root (source and build output), version, per-user config dir |
| [cli.ts](../../server/cli.ts) | `loopboard [path]`: start, or hand the repo to a running server found via `server.json`; a command table later slices extend — each entry declares its usage line and its flags |
| [args.ts](../../server/args.ts) | Splits arguments into positionals, switches and values against a command's declared flags; an unknown flag or a missing value is a `UsageError`, raised before the command runs |
| [ids.ts](../../server/ids.ts), [renumber.ts](../../server/renumber.ts) | `next-id` / `check` / `renumber`: IDs from the working tree, other worktrees' working copies and every local and remote-tracking branch (`git ls-tree`); duplicates are different names sharing a number; `check` also prints the reader's skipped files; renumber plans every edit before applying ([ADR-0004](decisions/0004-sequential-branch-aware-ids.md)) |
| [names.ts](../../server/names.ts) | The one matcher for `NNNN-slug.md` and `NN-slug`, shared by the reader, the workspace counter and the ID allocator: a name is valid, a near miss (capitals, spaces, a conflict copy — it keeps the number it claims) or neither (#0071) |
| [init.ts](../../server/init.ts) | `loopboard init [--upgrade]`: plans every file action (create, update, keep, keep-modified, link, block), then applies it; a manifest of shipped-file hashes in `.agents/.loopboard/manifest.json` tells untouched files from edited ones. Sources: this repo's `.agents/skills`, issue/project READMEs and templates, and [scaffold/](../../scaffold/) |
| [migrations.ts](../../server/migrations.ts) | Parses `MIGRATIONS.md` and a harness's level (the AGENTS.md marker, none → M000); per workspace: current, behind, unmarked, no AGENTS.md or missing, plus legacy `ai/` roots. `init` takes the latest level from here |
| [watch.ts](../../server/watch.ts) | One recursive `fs.watch` per root while a client listens; only `.md` paths count; bursts collapse into one event. A watcher that errors (or can't start) is reported as `stale` and reopened with backoff (1 s doubling to 30 s), then `ready`. Where `fs.watch` can't see — a symlinked `issues/` or `projects/`, or every root when `LOOPBOARD_POLL_MS` is set — it also polls those two folders (markdown paths and mtimes) and emits the same `change` (#0072) |
| [serve.ts](../../server/serve.ts), [open.ts](../../server/open.ts) | Production HTTP server with port fall-through (static files with `Range` support — Safari plays video only in parts); opening the browser |
| [issues.ts](../../server/issues.ts) | Status/assignee vocabularies, reading issues and projects. The filename's digits are the canonical ID — YAML 1.1 reads `0070` as octal, so `id:` is never trusted. `readBoard` returns what it couldn't show as `skipped` — malformed frontmatter, a near-miss name, an unreadable file, a project folder not named `NN-slug` — so nothing is dropped silently and one bad file never fails the request (#0071); frontmatter goes through [frontmatter.ts](../../server/frontmatter.ts), which bypasses gray-matter's cache so a skipped file can't return as a ghost (#0042). |
| [wip.ts](../../server/wip.ts) | Project digest: PRD problem/solution, WIP current focus, dated sessions (first entry per date wins). |
| [activity.ts](../../server/activity.ts), [git.ts](../../server/git.ts) | Issue history from `git log --follow` (status per version via `git show`), cached on HEAD + mtime; `git.ts` is the read-only git plumbing shared with the ID allocator |
| [views.ts](../../server/views.ts) | Saved views in `<config dir>/views/<workspace>.json` |
| [docs.ts](../../server/docs.ts) | The editor's document store: path validation (markdown under the root, no traversal), content hashes, hash-checked atomic writes |
| [create.ts](../../server/create.ts), [files.ts](../../server/files.ts) | Issue and project creation from the root's templates; atomic writes (temp file + rename), YAML-safe scalars |
| [mutate.ts](../../server/mutate.ts) | Validates against the vocabularies, then replaces single frontmatter lines inside the original text — field order, comments and every body byte survive; one `setLine` helper in [shared/frontmatter.ts](../../shared/frontmatter.ts) (also used by the editor) inserts missing fields next to their neighbours (`assignee` after `status`, `reviewed` after `created`) and removes markers; requires a non-empty `reason` for `wontfix` and appends it as `## Why rejected` (once). |
| [specs.ts](../../server/specs.ts) | Parses `specs/NN-*.md` into scenarios joined to their `## E2E coverage` rows by heading; weighted coverage math. |

## Per-user state

`<config dir>/workspaces.json` holds the registry (`workspaces`, `lastUsed`);
`server.json` holds the running CLI server's `{ port, pid }` and is removed
on exit; `views/<workspace>.json` holds that workspace's saved views. The config dir is `LOOPBOARD_CONFIG_DIR`, else `%APPDATA%/loopboard`
on Windows, else `$XDG_CONFIG_HOME/loopboard` or `~/.config/loopboard`.
Read-modify-writes run one at a time per key (`serialized` in
[files.ts](../../server/files.ts)): the registry per config dir, and each issue
file for PATCHes and editor saves — two picks in quick succession can't drop
each other's change. Every write goes through `writeFileAtomic` with a unique
temp name.

## Why targeted line edits

Agents and humans author these files; a full YAML re-serialize would reorder
keys, drop comments and churn every diff. The same principle drives the
planned editor ([ADR-0005](decisions/0005-wysiwyg-with-block-splice.md)).
