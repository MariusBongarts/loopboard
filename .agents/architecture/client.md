# Client

A Vue 3 app with `vue-router` ([router.ts](../../src/router.ts)): `/` redirects
to the last-used workspace, `/w/:ws` is the feed and `/w/:ws/specs` the Specs
view, `/w/:ws/issues` the list (filters in the query string, `&view=` for a
saved view), `/w/:ws/projects` the overview, `/help` the Help page and
`/needs-you` the cross-workspace queue. No store: [WorkspaceView.vue](../../src/views/WorkspaceView.vue) owns a
workspace's data and every write and provides the workspace context
([workspace.ts](../../src/workspace.ts)) to the components below it;
[InboxView.vue](../../src/components/InboxView.vue) owns navigation inside it.
All HTTP goes through [api.ts](../../src/api.ts); [live.ts](../../src/live.ts)
follows the workspace's event stream and triggers a debounced refetch.

## Components

| Component | Role |
|---|---|
| [WorkspaceView.vue](../../src/views/WorkspaceView.vue) | Loads `/api/w/:ws/data`; optimistic status/assignee/priority writes, reload on failure; hosts drawers and the wontfix modal |
| [HomeView.vue](../../src/views/HomeView.vue), [HelpView.vue](../../src/views/HelpView.vue), [WorkspaceMissing.vue](../../src/components/WorkspaceMissing.vue) | Redirect or welcome; Help rendered from [docs/](../../docs/) (`?raw` imports); the missing-root page, which WorkspaceView keeps polling |
| [SetupPrompt.vue](../../src/components/SetupPrompt.vue) | The one copyable setup prompt (`docs/setup-prompt.md`) |
| [CommandPalette.vue](../../src/components/CommandPalette.vue) | ⌘K; WorkspaceView builds the command list, [commands.ts](../../src/commands.ts) ranks it |
| [CreateIssueDialog.vue](../../src/components/CreateIssueDialog.vue), [CreateProjectDialog.vue](../../src/components/CreateProjectDialog.vue) | Quick capture; WorkspaceView opens the result once live data has it |
| [DocEditor.vue](../../src/components/DocEditor.vue), [RichEditor.vue](../../src/components/RichEditor.vue) | Editing (issues in the drawer, PRD/WIP tabs, specs): Rich mode = fields form + TipTap (`@tiptap/markdown`), Source mode = the raw file; hash-checked saves with conflict resolution |
| [ListView.vue](../../src/components/ListView.vue), [IssueList.vue](../../src/components/IssueList.vue) | The list view and its rows (also the project pane's List layout); grouping and filters in [list.ts](../../src/list.ts) |
| [ProjectsView.vue](../../src/components/ProjectsView.vue) | Project progress from [projects.ts](../../src/projects.ts) (WIP phase parsing) |
| [IssueActivity.vue](../../src/components/IssueActivity.vue) | The drawer's lazily loaded git history |
| [NeedsYouView.vue](../../src/views/NeedsYouView.vue) | `/needs-you` across workspaces; links back with `?item=` |
| [WorkspaceSwitcher.vue](../../src/components/WorkspaceSwitcher.vue) | Top-left menu (teleported, the rail clips); Add and Manage dialogs on [BaseDialog.vue](../../src/components/BaseDialog.vue) |
| [InboxView.vue](../../src/components/InboxView.vue) | Rail (search, views, projects, pins, resize) and feed (day groups, chips, `j`/`k`, `/`) |
| [ProjectPane.vue](../../src/components/ProjectPane.vue) | Board, PRD/WIP/Activity tabs, focus and selection strips |
| [Column.vue](../../src/components/Column.vue), [Card.vue](../../src/components/Card.vue) | Draggable columns and cards |
| [Drawer.vue](../../src/components/Drawer.vue), [BacklogDrawer.vue](../../src/components/BacklogDrawer.vue) | Issue detail; backlog list with promote |
| [SpecsView.vue](../../src/components/SpecsView.vue) and `Spec*.vue` | Specs table of contents, coverage, search and status chips |

[relations.ts](../../src/relations.ts) indexes `parent:` once per load (shared
through the workspace context with the issues, projects and saved views).
Cards, drawers and panes reach shared actions (copy a prompt, mark reviewed)
through [actions.ts](../../src/actions.ts) (provide/inject from
WorkspaceView) instead of bubbling events; [toast.ts](../../src/toast.ts) +
`Toasts.vue` confirm them, and [prompts.ts](../../src/prompts.ts) picks the agent
prompt. Rich saves go through [splice.ts](../../src/splice.ts): every top-level block whose
rendered HTML is unchanged keeps its original bytes, so the editor's own
formatting never reaches the diff; tables, HTML and link definitions travel
through the editor as `loopboard-raw` code blocks and come back verbatim.
Frontmatter fields use the same line edits as the server
([shared/frontmatter.ts](../../shared/frontmatter.ts)). Theme: [theme.ts](../../src/theme.ts) sets `data-theme` on `<html>` (an inline
script in `index.html` does it before first paint); dark values override the
same tokens in [styles.css](../../src/styles.css), and
[scripts/contrast.mjs](../../scripts/contrast.mjs) checks them in `pnpm verify`.
Fonts are self-hosted (`@fontsource-variable/*`); the
[Brand Kit](../design/Brand%20Kit.html) renders tokens and components from the
real stylesheet. Keyboard shortcuts come from one registry, [shortcuts.ts](../../src/shortcuts.ts):
handlers match against it and Help lists it. Pure logic lives outside
components so it can be unit-tested:
[inbox.ts](../../src/inbox.ts) (feed, filters, search, board columns, pins),
[types.ts](../../src/types.ts) (client types, column order, `relativePath`),
[projectDoc.ts](../../src/projectDoc.ts) (PRD/WIP rendering with issue
links), [linkify.ts](../../src/linkify.ts) (`#NNNN` → buttons in the drawer
body), [tasks.ts](../../src/tasks.ts) (tick a checklist line),
[colors.ts](../../src/colors.ts) (stable project tones).
[overflow.ts](../../src/overflow.ts) tells the board which edge hides columns
so CSS can fade it.

## Writes

Drops update local state first, then PATCH. A reorder waits for an in-flight
status flip of the same card, because the server validates the reorder
against the column on disk. A filtered column's order is spliced back into
the full column before sending. A failed write shows the error banner and
reloads; the reload clears only errors that came from a failed load, so the
write error stays until dismissed.

## Browser storage

`localStorage` through [storage.ts](../../src/storage.ts), which swallows
storage errors. Repo-specific state is keyed per workspace
(`loopboard.w.<workspace>.<key>`); a missing key falls back to the
pre-workspace `tracker.<key>` once, so old state carries over.

| Key | Holds |
|---|---|
| `loopboard.w.<ws>.inbox.selected` | Last selected feed item |
| `loopboard.w.<ws>.inbox.pinnedProjects` | Pinned project slugs, newest first |
| `loopboard.w.<ws>.specs.selectedId`, `….specs.enabledStatuses` | Specs view selection and status chips |
| `loopboard.railWidth` | Rail width in px |
| `loopboard.pane.focusCollapsed`, `loopboard.pane.pinnedCollapsed` | Strip collapse state |
