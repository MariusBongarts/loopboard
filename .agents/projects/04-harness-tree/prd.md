# A tree of harnesses — PRD

> Drafted: 2026-10-13
> Status: in-progress

## Problem statement

loopboard knows a flat list of workspaces. A workspace's id is the slug of its
folder name and lives only in the per-user registry, so moving or renaming a
folder brings the same harness back under a new id next to a "folder missing"
entry; and every harness counts its issues from 0001, so nothing can point
from one to another. The workflow also assumes code: `init` scaffolds specs
with E2E tables, asks for a verify command and links skills with symlinks; an
issue can't carry a deadline or say who outside owes a reply, and it can
depend on exactly one other issue in the same harness.

Someone who runs their code repos, a company and their private paperwork with
the same agents therefore gets several unrelated boards, and no place that
shows what's due, who they're waiting on and what blocks what across all of
them.

## Solution

One board for code, companies and private life. Every harness carries its own
identity in a small file, so loopboard recognises it wherever the folder goes,
and harnesses form a tree: a company above its two code repos, a "private"
node above taxes and a wedding. A harness doesn't have to be a git repo or
hold code — `loopboard init --kind docs` sets one up in a plain, cloud-synced
folder. A reference like `shop#0412` points at an issue, project or file in
another harness, and `loopboard check` says when it points nowhere. Issues can
carry a due date, say who they're waiting on (a person or an organisation,
each kept as a file every harness and every agent can read), depend on
several issues anywhere in the tree, and recur. An Overview page shows the
whole tree: what needs you, what's due, who you're waiting on, which projects
are active, what was last done where and how harnesses depend on each other.
Documents an issue links to open from the board.

Everything stays plain files. Nothing here needs git, an account or a
network.

## User stories

**Identity**

1. As a **maintainer of several harnesses**, I want **each harness to carry its id and name in a file inside it**, so that **the id doesn't depend on where the folder sits or what it's called**.
2. As a **maintainer**, I want **loopboard to recognise a harness I moved or renamed**, so that **its URL and saved views survive and no "folder missing" twin appears**.
3. As a **maintainer**, I want **a folder I reach through a symlink to stay one workspace**, so that **nothing is listed twice**.
4. As a **maintainer with two folders of the same name** (two "taxes"), I want **each to have its own id and display name**, so that **I can tell them apart everywhere**.
5. As a **maintainer**, I want **a harness to name its parent**, so that **a company can sit above its code repos without moving the repos**.
6. As a **maintainer**, I want **a folder that only groups other harnesses to be registrable without an issues folder**, so that **the tree has inner nodes without fake boards**.
7. As a **maintainer with running harnesses**, I want **the upgrade to add the identity file and keep my current id**, so that **nothing I bookmarked changes**.
8. As a **developer whose agents work in git worktrees**, I want **a worktree or second clone of a registered repo to open without being refused or becoming a second harness**, so that **parallel checkouts keep their boards and references still point at one harness**.

**Harnesses without code**

9. As a **person organising work that isn't code** (a company's paperwork, taxes, a wedding), I want **`loopboard init --kind docs` to set up issues and projects without specs, a verify command or skill copies**, so that **I don't delete half the scaffold first**.
10. As a **person whose documents live in a cloud-synced folder**, I want **the scaffold to work without git and without symlinks**, so that **the sync client doesn't break it**.
11. As an **agent in a docs harness**, I want **the workflow block and the READMEs to say what "done" means without a verify command, and to link nothing that isn't there**, so that **I close issues on evidence instead of a test run that doesn't exist**.
12. As a **person on a synced folder**, I want **conflict copies and briefly unreadable files reported, and live updates to recover on their own**, so that **the board stays truthful there** (#0071, #0072).
13. As a **person with a docs harness**, I want **an upgrade to bring new conventions without adding skills, symlinks or code folders**, so that **the harness stays as lean as it was set up**.

**References**

14. As a **maintainer**, I want **to write `shop#0412` for an issue in another harness**, so that **the reference is unambiguous although every harness has a `#0001`**.
15. As a **maintainer**, I want **`shop#P04` for a project and `company:contracts/lease.pdf` for a file**, so that **I can point at anything a harness holds, not only issues**.
16. As a **maintainer**, I want **a short alias to resolve like the full id**, so that **references stay quick to type**.
17. As a **developer**, I want **`loopboard check` to report a qualified reference that points nowhere**, so that **cross-harness links don't rot unnoticed**.
18. As an **agent**, I want **`loopboard where <id>` and `loopboard resolve <ref>` to print absolute paths**, so that **I can follow a reference into another harness without guessing where it lives**.
19. As an **agent**, I want **`loopboard next-id issue --harness <id>`**, so that **I can file an issue in another harness from where I'm working**.
20. As a **maintainer**, I want **qualified references in issues, PRDs and WIPs to be links that show the target's status**, so that **I see whether the other side moved without opening it**.

**Deadlines**

21. As a **maintainer**, I want **to give an issue a due date**, so that **work with a deadline doesn't look like every other todo**.
22. As a **maintainer**, I want **cards and rows to say "overdue" or "due soon"**, so that **I notice a deadline before it passes**.
23. As a **maintainer**, I want **to sort and filter the list by due date and save that as a view**, so that **"what's due in the next two weeks" is one click**.
24. As a **maintainer**, I want **everything overdue or due in the next 14 days across all harnesses in one place**, so that **a deadline in a harness I didn't open today can't hide**.

**Recurring work**

25. As a **maintainer with monthly and yearly duties**, I want **each period's issue to appear with its due date**, so that **nobody has to remember to file it**.
26. As a **maintainer**, I want **running the command twice to create nothing twice**, so that **a scheduled task can call it as often as it likes**.
27. As a **maintainer**, I want **loopboard's server never to create issues on its own**, so that **every file in my harness was written by me or by an agent I started**.

**People and organisations**

28. As a **maintainer**, I want **a person or an organisation to be one markdown file with notes, usable from every harness**, so that **what I know about the accountant isn't scattered over issues in three places**.
29. As a **maintainer**, I want **an issue to say `waiting-on: "@accountant"` and the board to show "Waiting on the accountant since 2 Oct"**, so that **I see who owes me a reply and for how long**.
30. As a **maintainer**, I want **`waiting-on` to leave the assignee alone, and issues that wait on someone else to be listed apart from my own moves**, so that **"Needs you" keeps meaning "your move"**.
31. As a **maintainer**, I want **`@accountant` in an issue to link to that person's page**, so that **I get from a mention to everything about them**.
32. As a **maintainer**, I want **a person's page to list every issue that mentions them or waits on them, across harnesses**, so that **before a call I see all open threads**.
33. As a **maintainer who names folders in my own language**, I want **loopboard to take an object's type from its frontmatter, not from the folder name**, so that **I can organise the objects folder however I like**.
34. As an **agent**, I want **`loopboard resolve @accountant` to print that person's file from any harness of the tree**, so that **I read what is known before I write to someone, and add what I learned afterwards**.

**Dependencies**

35. As a **maintainer**, I want **an issue to list several blockers**, so that **"needs these three first" doesn't need three fake parents**.
36. As a **maintainer**, I want **a blocker to be an issue or a project in another harness**, so that **"the announcement waits on the shop's release" is written down where agents can check it**.
37. As a **maintainer**, I want **an issue to show what it blocks elsewhere**, so that **I know what I unlock by finishing it**.
38. As a **maintainer**, I want **a blocker loopboard can't reach to count as unknown, not as done**, so that **agents don't start work that is still blocked**.

**Overview and navigation**

39. As a **maintainer**, I want **one Overview page with every harness as a tree**, so that **I see everything I run on one screen**.
40. As a **maintainer**, I want **each harness to show what needs me, what's due, who I'm waiting on and its active projects with their last session**, so that **I know where to look next and where work last happened**.
41. As a **maintainer**, I want **to see what was last done where — across every harness, also for work outside a project**, so that **I and my agents pick up the thread without opening each harness**.
42. As a **maintainer**, I want **a Connections section listing dependencies between harnesses with both sides' status**, so that **I see what holds up what**.
43. As a **maintainer**, I want **the workspace switcher to show the tree, tell same-named folders apart and count open issues**, so that **ten harnesses stay navigable**.
44. As a **maintainer**, I want **to register a whole folder tree in one step**, so that **I don't add ten harnesses by hand**.
45. As a **user of an open-source tool**, I want **loopboard never to look into a folder I didn't name**, so that **it doesn't crawl my home directory**.
46. As a **keyboard user**, I want **⌘K to find issues and projects in every harness and jump straight to `shop#0412`**, so that **I don't need to know where something lives**.

**Documents**

47. As a **person whose work results are documents**, I want **to open a linked PDF or spreadsheet from an issue**, so that **the issue is the way to the file**.
48. As a **maintainer**, I want **a linked markdown file to open inside loopboard**, so that **reading it doesn't lose my place**.
49. As a **maintainer**, I want **a Home tab with the harness's `INDEX.md`, `AGENTS.md` and identity**, so that **I see what a harness is and where things are without my editor**.
50. As a **developer**, I want **`loopboard check` to flag links to files that don't exist**, so that **an index doesn't send agents to dead paths**.

## Implementation decisions

The on-disk contract below was decided by the maintainer on 2026-10-13, and
so was its fine print: the id pattern, the reserved words, where a file
reference ends and what `init --kind` means (#0101). Two ADRs record it —
[ADR-0007](../../architecture/decisions/0007-identity-file-in-the-harness.md)
for the identity file and
[ADR-0008](../../architecture/decisions/0008-harness-ids-and-qualified-references.md)
for ids and references. Where a line still says **assumed**, it goes beyond
those decisions and names where the question is settled; two of them are
open questions in #0101 — a shared repository's identity file, and
worktrees. The contract can be written by hand: today's code ignores the
identity file and unknown frontmatter fields, and qualified references are
inert in issue bodies and for `check` (the one exception is #0100). The
examples use one tree throughout:

```text
home         index     top node; names the objects folder
├─ company   harness   docs
│  ├─ shop   harness   code    a repo somewhere else on disk
│  └─ site   harness   code
└─ private   index
   ├─ taxes    harness   docs
   └─ wedding  harness   docs
```

### The contract

- **Identity file.** Every harness and every index node has
  `.agents/harness.md`: YAML frontmatter plus one paragraph saying what the
  node is for. The file always sits at `.agents/harness.md` in the node's
  folder — also in a legacy harness whose issues live under `ai/`. Markdown
  with frontmatter, not JSON: the file watcher and the document store only
  handle markdown, the frontmatter parser exists, and a person can read it.
  Fields loopboard reads:

  | Field | Value |
  |---|---|
  | `schema` | integer; the version of this file format, `1` for now |
  | `id` | kebab-case ASCII; unique among the nodes you register; never changes. Lowercase letters, digits and hyphens, starting with a letter and ending with a letter or digit, 2 to 32 characters, and not a reserved word (ADR-0008) |
  | `name` | display name; any characters, quoted where YAML needs it |
  | `kind` | `harness` or `index` |
  | `parent` | the id of another node, or `null` for a top node |
  | `created` | `YYYY-MM-DD` |
  | `aliases` | optional; short ids that resolve like `id` |
  | `type` | optional; `code` or `docs`. **Assumed:** `code` when the field is missing |
  | `objects` | optional; path to an objects folder, relative to the node's folder. **Assumed:** it has to stay inside that folder |

  Any other field (say `access` or `related`) is preserved and ignored.

  ```markdown
  ---
  schema: 1
  id: company
  name: Example Company Ltd.
  kind: harness
  type: docs
  parent: home
  aliases: [co]
  created: 2026-10-13
  ---

  Contracts, bookkeeping and filings of the company. Its code lives in the
  `shop` and `site` harnesses.
  ```

- **Ids are descriptive and stable.** No UUIDs: an id is typed and read in
  references. For now an id is the folder's slug, which usually equals
  today's workspace id — not always: the registry appends `-2` when a second
  folder has the same name, and a name without letters or digits becomes
  `workspace`. So `init` looks at the registry before it writes an id
  (#0078), and a slug that breaks the pattern — `2026-taxes` starts with a
  digit — needs an explicit `--id`. Once loopboard reads the file, the id
  comes from there and survives a move or a rename of the folder.
- **A shared repository publishes its identity file.** In a git repository
  that others clone, `id`, `name`, `parent` and `aliases` travel to every
  clone. The file therefore holds what belongs to the project — this repo
  will ship `id: loopboard`, `name: loopboard`, `parent: null` — and ids and
  parents in a public repo should be generic. **Assumed** (#0101, question
  5, still open): a name or a parent that is personal lives in the per-user
  registry as an override; the file's values are the defaults.
- **Three node levels.** A **harness** has its own board (`issues/`,
  `projects/`). An **index node** has an identity and an `INDEX.md`, no
  `issues/`. Everything else is a plain folder. The tree is formed by
  `parent`, not by folder nesting: code repos stay where they are and hang in
  logically, so no `.git` or dependency folder ends up inside a synced folder.
  The node with `parent: null` is the tree's **top node**; it can be an index
  node or a harness.
- **Reference syntax.** Unqualified `#NNNN` stays local to the workspace.

  | Reference | Points at |
  |---|---|
  | `shop#0412` | issue 0412 in the harness `shop` |
  | `shop#P04` | project 04 in `shop`, by number |
  | `company:contracts/lease.pdf` | a file in `company`, relative to the harness folder |
  | `co#0031` | the same as `company#0031` — aliases resolve like ids |

  Qualified references are backward compatible where it matters most:
  `check` and the linkifier of issue bodies never match a `#NNNN` that
  directly follows a letter or digit, so `shop#0412` is inert there. Two
  other matchers have no such guard — the one that links issue numbers in a
  WIP's current focus, session notes and pinned notes, and the one that
  collects the issues of a phase. There `shop#0412` is read as the local
  issue 0412 until #0100 is fixed.

  In frontmatter lists a local issue is written as bare digits (`0042`),
  because a `#` after a space starts a YAML comment, and the list is written
  flow-style on one line.

  Decided in #0101 (ADR-0008): a path ends at the next whitespace, without
  trailing punctuation, and writes a space as `%20`; `<word>:<path>` only
  counts as a reference when the word is a registered id or alias; an
  issue's `source:` line is never scanned; and some words can never be ids
  or aliases — the URL schemes `http`, `https`, `mailto`, `file`, `ftp` and
  `tel`, `github` (the `source: github#N` field has the shape of a
  reference), the YAML keywords `true`, `false`, `null`, `yes`, `no`, `on`
  and `off`, and `workspace`.
- **Docs harnesses live without git.** They sit in a cloud-synced folder.
  Everything must work without git, and the docs scaffold must not depend on
  symlinks, because the sync client doesn't sync a symlink as a folder. Conflict
  copies and briefly unreadable files are normal there; reporting them and
  recovering the watcher are #0071 and #0072.
- **`init --kind` picks the scaffold.** `code` (the default) is today's
  scaffold plus the identity file. `docs` writes the identity file
  (`kind: harness`, `type: docs`), an AGENTS.md workflow block without a
  verify command and without specs, and `issues/` and `projects/` with
  READMEs and templates worded for a harness without code — no skill copies
  by default, no symlinks, and no link to a file the scaffold didn't create.
  `index` writes the identity file (`kind: index`) and an `INDEX.md`
  (#0104). The flag names the scaffold, not the field, and maps onto the
  file's `kind` and `type` (ADR-0007): `code` is `kind: harness` with
  `type: code`, `docs` is `kind: harness` with `type: docs`, and `index` is
  `kind: index` without a type.
- **Objects.** Two types to start: `person` and `organisation`, one markdown
  file each, with frontmatter `type`, `id`, `name` and, on a person, an
  optional `org`. The body is free notes — what you and your agents know
  about them, across every harness, private or business. They live in the
  folder the tree's top node names in `objects:` (say `objects: .objects` on
  `home`); loopboard takes the type from frontmatter, not from folder names,
  so the folders below can be called anything in any language.
  A reference is `@id`; people and organisations share one id namespace. In
  frontmatter the value is quoted, because YAML doesn't allow a plain value
  to start with `@`.

  ```markdown
  ---
  type: person
  id: accountant
  name: The accountant
  org: "@accounting-firm"
  ---

  Does the company's books. Prefers one email per topic and answers within
  a week.
  ```

- **Reserved issue fields.** All optional.

  | Field | Value | Meaning |
  |---|---|---|
  | `due` | `YYYY-MM-DD` | the day it has to be finished |
  | `waiting-on` | `"@id"` or a list of them | who owes a reply; the board shows "Waiting on the accountant since 2 Oct" |
  | `blocked-by` | a list of references | every issue or project that must finish first; qualified references allowed |
  | `recurrence` | written by `loopboard recur` | which recurring duty and period this issue stands for |

  `parent:` stays valid as the single local blocker.

  ```markdown
  ---
  id: 0031
  title: Announce the new prices
  category: task
  status: blocked
  assignee: human
  due: 2026-11-30
  waiting-on: "@accountant"
  blocked-by: [0029, shop#0412]
  labels: [pricing]
  created: 2026-10-13
  ---
  ```

- **`waiting-on` is not an assignee.** Today any assignee other than `agent`
  or `human` silently becomes `agent`. `waiting-on` answers "who owes me a
  reply" next to the assignee; the vocabulary stays `agent` and `human`. In
  the board, "Waiting on" means people and organisations; an open issue
  blocker reads "blocked by".

### How loopboard reads it

- **The file wins over the registry.** The per-user registry becomes a map
  from id to path and remembers the last values it read: once a harness is
  known by the id in its file, a missing or briefly unreadable file never
  sends it back to the folder slug. Registration compares real paths, so a
  symlink is not a second workspace. A known id at a new path whose old path
  is gone updates the entry in place. When both paths exist, a plain copy is
  refused and both folders are named. A git worktree or second clone is not
  a copy: the identity file is committed, so every checkout carries the same
  id. **Assumed** (#0101, question 6, still open; built in #0080): it opens
  as a secondary checkout of the same harness, and references resolve to the
  primary one. Without an identity file a workspace behaves as it does
  today.
- **Root detection keeps its order.** `.agents/issues`, then `ai/issues`.
  The identity file is a second way in only for a node that has neither: an
  index node, or a harness whose `issues/` doesn't exist yet. It never wins
  over an existing root.
- **Cross-harness reads are light.** Reference links, the due list, the
  Overview, the switcher's counts and ⌘K read one **harness index** — rows of
  frontmatter fields per harness — never issue bodies, never one full
  workspace load per harness. #0084 builds it; later issues add fields
  instead of routes. Backlinks are the exception: mentions live in bodies,
  so they need a body scan — one pass per harness, cached per file. The
  measurements behind this are in #0075.
- **One reference parser.** Server, CLI and client share one parser for the
  three qualified forms and `@id`, so `check`, `resolve` and the board agree
  on what a reference is. It leaves code, links, URLs, email addresses and
  the `source:` line alone.
- **Frontmatter is read from the raw line where YAML would bend it.** Lists
  of references, and the identity file's `id`, `parent` and `aliases`:
  loopboard's YAML reader turns `0042` into the octal number 34 (#0059) and
  `true` or `null` into a boolean or nothing, and stricter YAML 1.1 readers
  do the same to `yes`, `no`, `on` and `off`.
- **Objects resolve through the top node.** A harness finds its objects by
  walking `parent` up to the top node and reading that node's `objects:`
  folder. A harness whose top node isn't registered has no objects, and
  `@id` stays plain text.
- **A due date is a day.** No time of day. An open issue is overdue when its
  date is before today in the local time zone, and "due soon" is the next 14
  days, everywhere.
- **Recurrence is a CLI command.** `loopboard recur` creates the issue for
  the current period and stamps it with `recurrence:`, which is what makes a
  second run a no-op. A scheduled agent task or cron calls it; the server has
  no timer and no route that creates issues by itself.
- **An unreachable blocker is unknown.** A blocker in a harness that isn't
  registered or whose folder is missing never counts as done.
- **Opening a file is a guarded action.** Opening a document with the
  system's default app is the first time the server starts a program on a
  path that comes from a request. The route takes POST only and requires the
  app's own origin — today's guard lets a request without an `Origin` header
  through — for a path whose real path lies inside a registered harness
  folder, and for document types — never something that would run.
- **One migration, for the identity file.** It is the one change an existing
  harness has to act on, so it gets its `MIGRATIONS.md` entry (#0103).
  **Assumed:** the reserved fields get none. They are optional, a harness
  that doesn't use them has nothing to do, and their README and template
  text reaches existing harnesses through upgrade-harness like any other
  wording. Reserving the names here is what lets files written today stay
  valid.

### Earlier decisions this PRD re-states

- **ADR-0002, no auto-discovery.** Still true: loopboard never crawls the
  home directory. New: registering a folder tree the user names is opt-in and
  gets a new ADR that amends ADR-0002.
- **ADR-0002, identity in the per-user registry.** ADR-0002 keeps a
  workspace's id and name only in the registry and doesn't say where the id
  comes from; the code slugs the folder name. Both now come from the
  harness, and the registry maps id to path. ADR-0002 also keeps personal
  state "never in the repo": a personal name or parent stays in the registry
  as an override — still assumed (#0101, question 5). ADR-0007 records both
  and amends ADR-0002.
- **ADR-0003 rejected "a per-repo config file".** The identity file doesn't
  name the root, and root detection keeps its order; it gains a second way
  in for nodes that have an identity file and no `issues/` (#0081). It is one
  more file per harness — accepted because an id that lives outside the
  harness can't survive a move; `init` and the migration write it, so nobody
  keeps it by hand (ADR-0007).
- **#0028, "`parent:` is the only relation".** `blocked-by:` adds a
  multi-valued relation that can cross harnesses. `parent:` keeps working.
  The badge and toggle #0028 called "waiting" become "blocked by" and "Hide
  blocked", because "Waiting on" now names a person.
- **Project 01, question 9, "keep the file count" in the switcher.** The
  switcher shows open issues and "Needs you" instead; the harness index
  makes that cheap, which was the reason against it.
- **Spec § 7, "Open the last-used workspace".** With more than one node
  registered, `/` opens the Overview; the last-used workspace is one click
  away.
- **Spec § 7, "Rename and remove workspaces".** Renaming used to change the
  registry only. With an identity file there are two places a name can live;
  which one the board writes is part of #0079.
- **The glossary's "Harness".** No longer "in a repo": a harness is a folder
  with an identity, and it may come without skills.
- **The glossary's "Root".** It keeps meaning the folder loopboard reads
  (`.agents/`, or a legacy `ai/`). The top of the tree is the **top node**,
  never "the root".
- **PRD 01, "files and git are the sync layer".** Git becomes optional
  everywhere, and a cloud-synced folder is a supported home for a docs
  harness. loopboard itself still syncs nothing.

### Unchanged

The status vocabulary. Assignee is `agent` or `human`. Files are the only
source of truth. No accounts, no telemetry. loopboard starts no agents. The
server never creates issues on its own. Cross-workspace pages refresh on open
and on window focus instead of watching every harness (#0023). IDs stay
sequential per harness (ADR-0004): two machines sharing a synced folder can
hand out the same number, `check` reports it and `renumber` fixes it.

## Testing decisions

- Tests exercise behaviour through the CLI, the HTTP API, files on disk and
  the rendered UI — as in project 01.
- **Vitest on real temp directories that are not git repos** for: the
  identity file (valid, missing, invalid, unreadable after it was read once,
  unknown fields kept), the registry (symlink, move, copy, changed id), the
  `docs` and `index` scaffolds, the reference parser (a table of text →
  references, including URLs, email addresses, `github#1234` and code),
  `check` with two registered harnesses, the CLI commands run from a foreign
  working directory, due-date boundaries, recurrence period maths (month
  ends, quarters, leap day), the object reader and the blocker index.
- **Real git where git is the point**: a `git worktree add` of a registered
  harness, including the dev server started from that worktree.
- The legacy `ai/` fixture gets an identity file and must still show its
  issues.
- **The docs scaffold is checked for dead ends**: a test walks every relative
  link in a freshly scaffolded docs folder.
- Every test uses its own config directory; none touches the real registry.
- **Playwright** gets a fixture tree — an index node above a docs harness and
  a code harness, with an objects folder — for the Overview, the tree
  switcher, reference links, object pages, due dates, waiting-on, the Home
  tab and the document view. Every new scenario gets a spec row, and each
  issue names the spec section it touches.
- **Synced folders are simulated**: conflict-copy file names, an unreadable
  file, a watcher error. No sync client runs in CI, so the maintainer checks
  the docs scaffold once in a real synced folder.
- **The file-open route gets security tests**: path traversal, a symlink
  leading out of the harness, a foreign origin, a missing origin, a file type
  that would run.
- **The harness index is measured** against the generated large fixture
  from #0075; the budget is written into the test (#0092).
- Prior art: `tests/workspaces.test.ts`, `tests/init.test.ts`,
  `tests/ids.test.ts`, `tests/cli.test.ts`, `tests/relations.test.ts`,
  `tests/e2e/07-workspaces.spec.ts`, `tests/e2e/cli.spec.ts`.

## Out of scope

- **Finding harnesses on its own.** No scan of the home directory or of any
  folder the user didn't name (ADR-0002 stands).
- **Nesting code repos physically inside the tree.** `parent` builds the
  tree; moving repos into a synced folder brings `.git` and dependency
  folders with them.
- **New statuses or assignees.** No named third parties as assignee —
  `waiting-on` covers them — and no "waiting" status.
- **A scheduler in the server.** Recurring issues come from a command
  someone or something else runs.
- **Private glue.** A hook of one agent tool that writes a journal, a pointer
  file to the tree and a skill that routes a request to the right harness
  stay outside the product: they depend on one person's setup and agent
  tool. The need behind the journal is in scope: the Overview's "Recent"
  section shows what was last done where (#0092), and a written log at the
  top node is an open question (#0109).
- **More object types and an object graph.** Two types to start. No custom
  types, no relations between objects beyond `org`, no graph view; the type
  lives in frontmatter so more can follow without moving files.
- **Calendars, reminders, notifications.** A due date is shown and sorted,
  nothing pings.
- **Non-ASCII issue file names.** The file-name pattern stays; #0071 reports
  what it skips.
- **Access control.** A field like `access` is preserved and ignored; the
  local server reads every harness you registered.
- **Rendering PDFs or office files in the board.** They open in the
  system's app.
- **Syncing, accounts, team support.** As in project 01.

## Further notes

- New terms land in the glossary with the spec updates: harness id, index
  node, top node, docs harness, qualified reference, harness index, object,
  waiting on, blocked by, due.
- Order, decided with the contract: before the maintainer creates a tree of
  harnesses, the CLI is callable from anywhere and the registry is clean
  (#0076, #0099), slugs transliterate umlauts (#0077), skipped files are
  visible (#0071), the watcher recovers (#0072) and `init --kind docs` exists
  (#0078). Two things joined that list in review: the ADRs that fix the id
  pattern (#0101), because an id never changes once written, and the WIP
  matchers that misread a qualified reference (#0100). The rest follows the
  tree.
- What the contract leaves open is listed as questions in
  [`wip.md`](./wip.md), each with the answer the issues assume.
- If this PRD outgrows one project, deadlines, people and documents
  (phases 2 and 4) are the natural part to split off.
