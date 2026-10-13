# A tree of harnesses — WIP

> Last updated: 2026-10-13
> PRD: [./prd.md](./prd.md)
> Status: in-progress

## Current focus

Nothing is built yet. Work starts with what has to land before a tree of
harnesses is created, in the decided order:
[#0076](../../issues/0076-cli-callable-everywhere-and-registry-cleanup.md)
and [#0099](../../issues/0099-list-and-forget-workspaces-from-the-cli.md)
(the CLI and the registry), then
[#0077](../../issues/0077-slugs-replace-umlauts-with-a-dash.md) (slugs),
#0071, #0072 and #0100, then
[#0078](../../issues/0078-init-kind-docs.md) — `loopboard init --kind docs`.
#0078 can't start before
[#0101](../../issues/0101-adrs-for-identity-ids-and-references.md), the ADRs
that fix the id pattern and the reference syntax, and #0101 waits on the
maintainer's answers. The identity file (#0079) comes next and unblocks the
rest of phase 1. Read "Questions for the maintainer" first: four issues wait
on answers.

## Before the tree

What should be `done` before a tree of harnesses is created in real folders,
in this order. The first six are standalone issues, not part of this project.

1. [#0076 Make the CLI callable everywhere](../../issues/0076-cli-callable-everywhere-and-registry-cleanup.md) and [#0099 List and forget registered workspaces from the CLI](../../issues/0099-list-and-forget-workspaces-from-the-cli.md) — agents call the CLI from every harness, and the registry should be clean before new entries go in
2. [#0077 Slugs replace umlauts with a dash](../../issues/0077-slugs-replace-umlauts-with-a-dash.md) — an id is the folder's slug for now, never changes once written, and ends up in references
3. [#0071 Skipped and unreadable issue files vanish without a trace](../../issues/0071-skipped-and-unreadable-issue-files-are-invisible.md) — conflict copies and briefly unreadable files are normal on a synced folder
4. [#0072 Live updates stop silently when the file watcher fails](../../issues/0072-live-updates-stop-silently-when-the-watcher-fails.md) — so is a watcher that drops out
5. [#0100 A qualified reference in a WIP note links to the local issue with the same number](../../issues/0100-qualified-reference-in-a-wip-note-links-to-the-local-issue.md) — references to other harnesses will be written by hand before loopboard reads them
6. [#0101 Record the identity file, the id pattern and the reference syntax in ADRs](../../issues/0101-adrs-for-identity-ids-and-references.md), then [#0078 Set up a harness without code with loopboard init --kind docs](../../issues/0078-init-kind-docs.md)

Until those are done:

- **Don't run `loopboard init --kind docs`.** Today's CLI ignores the flag,
  takes `docs` for the target and scaffolds a full code harness — skills and
  eight symlinks — into a new `docs/` folder. #0076 makes it refuse; #0078
  makes it work.
- **Don't write ids into identity files** before #0101 is accepted: an id
  never changes, and its pattern isn't fixed yet.
- **Register each harness once, through its real path.** A symlinked path
  becomes a second workspace until #0080 lands.
- **Don't move or rename a registered harness folder** until #0079 and #0080
  land: it still gets a new workspace id.
- **Keep references to other harnesses out of WIP notes and phase lists**
  until #0100 is fixed.

The rest of phase 1 can follow the tree. Once #0101 is accepted, identity
files and references can be written by hand, because today's code ignores
them; #0102 has to be done before the first upgrade of a docs harness.

Before phase 3: #0074 (one "Needs you" rule) and #0075 (the generated large
fixture and its measurements) — the Overview builds on both. Also related
and standalone: #0073 (relative links; #0097 builds on it).

## Phases

Phase 1 is `todo`. Phases 2–4 are `backlog` on purpose: a phase's issues
move to `todo` when the phase before it is done. Until then the project's
progress counts phase 1 only, and "Copy agent prompt" on a backlog issue
asks to sharpen it — these are already sharpened, so promote them with the
triage skill instead. Where an issue needs more than its `parent:`, its
Notes say "Also needs".

### Phase 1 — Identity and contract

Goal: a harness carries its own identity, a harness without code can be scaffolded, and references between harnesses are defined, checked and resolvable.

- [ ] [#0101 Record the identity file, the id pattern and the reference syntax in ADRs](../../issues/0101-adrs-for-identity-ids-and-references.md) — todo (human: questions)
- [ ] [#0078 Set up a harness without code with loopboard init --kind docs](../../issues/0078-init-kind-docs.md) — todo
- [ ] [#0102 Keep a docs harness lean when it is upgraded](../../issues/0102-keep-a-docs-harness-lean-through-upgrades.md) — todo
- [ ] [#0079 Take a harness's id, name and parent from its identity file](../../issues/0079-harness-identity-file.md) — todo
- [ ] [#0080 A moved or symlinked harness shows up as a second workspace](../../issues/0080-moved-or-symlinked-harness-becomes-a-second-workspace.md) — todo
- [ ] [#0103 Write the identity file for code harnesses and add it to existing ones](../../issues/0103-write-the-identity-file-for-code-harnesses-and-migrate.md) — todo
- [ ] [#0081 Register index nodes — folders that group harnesses but hold no issues](../../issues/0081-register-index-nodes.md) — todo
- [ ] [#0104 Scaffold an index node with loopboard init --kind index](../../issues/0104-init-kind-index.md) — todo
- [ ] [#0082 Reference issues, projects and files in other harnesses and check them](../../issues/0082-qualified-references-syntax-and-check.md) — todo
- [ ] [#0083 Turn an id or a reference into a path with loopboard where and resolve](../../issues/0083-where-resolve-and-next-id-harness.md) — todo
- [ ] [#0084 Follow references to other harnesses in the board](../../issues/0084-qualified-references-in-the-board.md) — todo

### Phase 2 — Deadlines and people

Goal: issues carry due dates and say who they wait on; people and organisations are files every harness and agent can reach, with a page; recurring duties file themselves through a command.

- [ ] [#0085 Give issues a due date and see what's overdue](../../issues/0085-due-dates.md) — backlog
- [ ] [#0105 Sort, group and filter the list by due date](../../issues/0105-sort-group-and-filter-by-due-date.md) — backlog
- [ ] [#0086 See what's due across all harnesses](../../issues/0086-due-across-harnesses.md) — backlog
- [ ] [#0087 Keep people and organisations as files every harness can reach](../../issues/0087-people-and-organisations-as-files.md) — backlog
- [ ] [#0106 Browse people and organisations in loopboard](../../issues/0106-browse-people-and-organisations.md) — backlog
- [ ] [#0088 Say who owes a reply with waiting-on](../../issues/0088-waiting-on.md) — backlog (human: questions)
- [ ] [#0107 Set and filter waiting-on from the board](../../issues/0107-set-and-filter-waiting-on-from-the-board.md) — backlog
- [ ] [#0089 Link @mentions and show backlinks on a person's page](../../issues/0089-mentions-and-backlinks.md) — backlog
- [ ] [#0090 Create recurring issues with loopboard recur](../../issues/0090-recurring-issues-with-loopboard-recur.md) — backlog (human: questions)

### Phase 3 — Dependencies and overview

Goal: blockers cross projects and harnesses, and one Overview shows the whole tree with its connections and what was last done where; the switcher and ⌘K follow the tree.

- [ ] [#0091 Block an issue on several issues, also in other harnesses](../../issues/0091-blocked-by-across-harnesses.md) — backlog
- [ ] [#0092 See every harness on one Overview page](../../issues/0092-overview-page.md) — backlog
- [ ] [#0093 Show how harnesses depend on each other on the Overview](../../issues/0093-connections-on-the-overview.md) — backlog
- [ ] [#0109 Keep a log at the top of the tree of what was done where](../../issues/0109-log-of-what-was-done-where.md) — backlog (human: questions)
- [ ] [#0094 Show the workspace switcher as a tree](../../issues/0094-workspace-switcher-as-a-tree.md) — backlog
- [ ] [#0095 Register a whole folder tree in one step](../../issues/0095-register-a-folder-tree.md) — backlog
- [ ] [#0108 Add a folder tree from the switcher](../../issues/0108-add-a-folder-tree-from-the-switcher.md) — backlog
- [ ] [#0096 Search every harness from ⌘K and jump to a qualified reference](../../issues/0096-command-palette-across-harnesses.md) — backlog

### Phase 4 — Documents

Goal: the documents an issue points at open from the board, and every harness has a Home with its index and instructions.

- [ ] [#0097 Read linked markdown files inside loopboard and see which links are broken](../../issues/0097-open-documents-from-the-board.md) — backlog
- [ ] [#0110 Open and reveal linked documents with the system's apps](../../issues/0110-open-and-reveal-linked-documents.md) — backlog
- [ ] [#0098 Add a Home tab with INDEX.md, AGENTS.md and the identity](../../issues/0098-home-tab.md) — backlog

## Activity log

### 2026-10-13 — review round

- Two reviewers checked the plan against the code and against the
  maintainer's decisions; their findings are applied. Nothing is built yet.
- Twelve issues were added (#0099–#0110). Two are standalone: #0099, the
  registry half of #0076, and #0100, a bug the review found — two of the four
  places that match an issue number misread a reference to another harness.
  Ten belong to the project: #0101 (the ADRs, first in phase 1), #0102,
  #0103 and #0104 in phase 1, #0105, #0106 and #0107 in phase 2, #0108 and
  #0109 in phase 3, #0110 in phase 4. Eight of the twelve are splits of
  issues that were too big for one session.
- What changed in the contract's fine print: the identity file always sits
  in `.agents/`, also next to a legacy `ai/` root, and never wins over an
  existing root; a harness that was identified once never falls back to its
  folder slug; a git worktree or second clone opens as a secondary checkout
  instead of being refused; a shared repository's file holds the project's
  identity, with personal overrides in the registry; `init` checks the
  registry before it writes an id.
- The docs scaffold gets its own READMEs, PRD template and AGENTS.md
  skeleton. The code ones link to skills, specs and architecture docs and
  define done by the verify command.
- One window for "due soon": 14 days, everywhere. "Waiting on" now means
  people only; the blocker badge and toggle become "blocked by" and "Hide
  blocked" (#0088).
- One migration instead of five: the identity file (#0103). The optional
  fields are documented through the README and the templates.
- The harness index has one owner, #0084; later issues extend it.
- The request for a root memory file is on the board again: the Overview
  gets a derived "Recent" section (#0092), and #0109 holds the open question
  of a written log.
- Verified while fixing: with loopboard's own YAML reader `on`, `no`, `yes`
  and `off` stay text; `true`, `false`, `null`, numbers and dates are
  converted. The identity file's `id`, `parent` and `aliases` are still read
  from the raw line, and all of those words are proposed as reserved.

### 2026-10-13 — planning

- Project planned; nothing built. The maintainer decided the on-disk
  contract — the identity file `.agents/harness.md`, the reference syntax
  (`<id>#NNNN`, `<id>#PNN`, `<id>:<path>`), three node levels, people and
  organisations as object files, and the reserved issue fields `due`,
  `waiting-on`, `blocked-by` and `recurrence` — and the order: CLI and
  registry, slugs, #0071, #0072 and `init --kind docs` before a tree of
  harnesses is created, everything else after.
- Product direction: these capabilities become part of the public product,
  worded generically — "one board for code, companies and private life".
  Private glue (a journal hook, a pointer file, a routing skill) stays
  outside.
- The plan rests on a read-only analysis of the product; its measurements
  are in #0071–#0075, filed the same day.
- Filed: PRD, two standalone issues (#0076, #0077) and 21 project issues
  (#0078–#0098) in four phases. Phase 1 is `todo`, phases 2–4 are `backlog`.
- Sliced finer than first sketched: identity is three issues (the file, a
  moved or symlinked harness, index nodes), references three (syntax and
  `check`, the CLI lookups, links in the board), due dates two (one
  workspace, across harnesses), people three (object files, `waiting-on`,
  mentions and backlinks), the Overview two (the page, Connections) and the
  switcher two (tree, registering a folder tree).

## Questions for the maintainer

Collected while planning and in the review round. Each has the answer the
issues assume, so work can continue where nothing is blocked; overrule
anything. Questions 2–4 block #0078 through #0101.

1. **A root log of what was done where (#0109).** You asked, as a maybe, for
   a root memory file that keeps book whenever something was done somewhere.
   The product direction keeps a journal hook out of the product; the need
   itself is in. Assumed: the Overview shows a "Recent" list derived from
   the session entries every WIP already has (#0092). That doesn't cover
   work on standalone issues or harnesses without projects — a docs harness
   often has none. For those, #0109 proposes a `LOG.md` at the top node that
   a CLI command appends to from the session loop. Derived only, written
   too, or something else?
2. **Id pattern and reserved words (#0101).** Assumed: lowercase letters,
   digits and hyphens, starting with a letter, 2 to 32 characters; URL
   schemes, `github`, YAML keywords and `workspace` can't be ids. A folder
   whose slug starts with a digit then needs an explicit id.
3. **File references and the `source:` line (#0101).** Assumed: a path ends
   at whitespace and writes a space as `%20`; a word before a colon only
   counts when it is a registered id; `source:` is never scanned.
4. **`--kind` on `init` versus `kind:` in the file (#0101).** The flag is
   `--kind docs`, while the file's `kind` is `harness` or `index` and `docs`
   is a `type`. Assumed: the flag names the scaffold (`code`, `docs`,
   `index`) and maps onto the two fields; `--kind index` is my addition
   (#0104). Rename the flag if the double meaning bothers you.
5. **A shared repository's identity file (#0101, #0079).** In a public repo
   `id`, `name` and `parent` are public. Assumed: this repo ships
   `id: loopboard` and `parent: null`, and a personal name or parent lives
   in the registry as an override — so a public repo can hang under a
   private node on your machine without naming it. Renaming in the board
   writes the override for a git repo and the file otherwise.
6. **Worktrees and second clones (#0101, #0080).** Every checkout carries
   the same committed id. Assumed: the first one registered is the harness,
   another opens as a secondary checkout under a local key and is never the
   target of a reference.
7. **"Since" for `waiting-on` (#0088).** The contract shows "Waiting on …
   since …" but names no field for the date. Assumed: an optional
   `waiting-since: YYYY-MM-DD`, falling back to `created`. This adds a field
   to the contract — your call.
8. **Does `waiting-on` still count as "Needs you" (#0088)?** The PRD's
   example is assigned to you and waits on the accountant. Assumed: the
   count rule from #0074 stays, and such issues are listed apart, as
   "Waiting on others", with the name and the date.
9. **Where recurring duties live (#0090).** `recurrence:` and
   `loopboard recur` are decided; the place for the definitions isn't.
   Assumed: one file per duty in `.agents/recurring/`.
10. **How many migrations.** Assumed: one, for the identity file (#0103).
    `due`, `waiting-on`, `blocked-by` and `recurrence` are optional and need
    nothing from an existing harness, so they are documented through the
    README and templates that upgrade-harness merges. M001 did list the
    optional `source:` field — say so if each field should get an entry.
11. **Phase 1 and the tree.** The order you decided puts only #0078 of this
    project before the tree; the review added #0101, because ids are
    written by #0078 and never change. I kept the whole phase at `todo`,
    because the identity file is what stops a moved folder from getting a
    new id.

## Deferred / out of scope (added during execution)

Cut while slicing, on 2026-10-13 — foreseen boundaries are in the PRD's
"Out of scope".

- Hiding code-only parts of the board in a docs harness (the Specs entry,
  git history) — cosmetic; the board works without it.
- Skills for docs harnesses — the docs scaffold copies none. Whether they
  come from a shared user-level folder or as copies is undecided.
- A picker for `blocked-by` in the board — agents and the editor write the
  line until the field has proven itself (#0091).
- Dependencies declared on a project (a line in the WIP header) — an issue
  can already be blocked by a project.
- Rewriting qualified references in other harnesses when an issue is
  renumbered — `check` in the other harness reports the break (#0082).
- Creating or editing people and organisations from the board (#0087).
- A "create now" button for upcoming recurring duties on the Overview
  (#0090).
- Git history when several harnesses share one git repository: "commits
  mentioning" an issue number searches the whole repository, so harnesses
  with the same number mix. One git repository per harness, or none, avoids
  it.

Cut in the review round, also on 2026-10-13:

- `loopboard workspaces forget --missing` and telling a git worktree from
  its main checkout in the list — forgetting by id is enough for a one-time
  cleanup (#0099).
- A lasting redirect from an old workspace id, and moving pins and the last
  selection in the browser to a new one — an id is meant never to change
  (#0080).
- A "Rescan" action and a registry that remembers trees — running
  `loopboard add --tree` again does the same (#0095).
- A type-to-filter field in the switcher — ⌘K already switches by name
  (#0094).
- Weekly recurring duties and week numbering — month, quarter and year
  first (#0090).
- Backlink counts for an organisation's people (#0089).
- `blocked-by:` lines in this project's own issues before loopboard reads
  the field: a second dependency is written as "Also needs" in the Notes,
  where agents look today (#0091).

## Ship summary

(Filled in only when status flips to `shipped`.)
