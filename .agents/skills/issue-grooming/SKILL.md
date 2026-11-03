---
name: issue-grooming
description: Groom the whole board — check every issue that isn't archived (backlog, todo, in-progress, in-review, blocked, and done ones left on the board) against what actually happened in git, merged PRs, releases and deploys; close what shipped, turn leftover human tasks into tasks, archive what's finished, move what nobody plans into the idea PRDs, and ask the maintainer with a recommendation whenever unsure. Also the daily sweep a routine runs unattended. Use when the user says "groom the issues", "groom the backlog", "clean up the board", "too much is stuck in review", "what's stale?", or after a release, a deploy or a project ship.
---

# Issue grooming

Boards drift from reality in predictable ways: `in-review` waits for a look the
maintainer never gets to while the change ships anyway; `in-progress` outlives
its session; `blocked` outlives its parent; old `todo` and `backlog` items get
duplicated or overtaken. Grooming reconciles every live issue with what really
happened, fixes the clear cases itself and asks about the rest.

The maintainer often considers work done without saying so. So silence is not a
reason to keep waiting: shipped with nothing reported against it means done.

Statuses, assignee and body sections follow
[`.agents/issues/README.md`](../../issues/README.md); transitions and the
`## Why rejected` template follow the [`triage`](../triage/SKILL.md) skill.
Read both first.

Modes:

- **Report** — "what's stale?", "dry run", or the first run in a repo:
  steps 1–3, write nothing.
- **Groom** — all steps.
- **Daily sweep** — the same rules, unattended, from a routine: see
  [Daily sweep](#daily-sweep).

## 1. Collect

- **Live issues**: every `.agents/issues/*.md` (not `_archive/`), any status.
  Per issue: frontmatter, acceptance criteria ticked/total, which of
  `## Review`, `## Questions`, `## Why rejected`, `## Gate` exist, `created:`,
  the last change to the file (`git log -1 --format=%cs -- <file>`), and whether
  the file has uncommitted changes.
- **Projects**: for each `project:`, the `wip.md` status (shipped?) and
  activity entries that mention the issue.
- **Releases, once per run**: tags with dates
  (`git tag --sort=-creatordate --format='%(refname:short) %(creatordate:short)'`),
  released sections of `CHANGELOG.md`, and — when `gh` works and the repo has
  a remote — `gh release list` and merged PRs. Use the deploy or release step
  AGENTS.md names, if any.

On big boards, script this into one table instead of reading issue by issue;
open full bodies only for issues that need judgment.

## 2. Gather evidence

For each issue, look for proof that the work happened — strongest first:

1. **Released** — a commit for the issue is in a release
   (`git tag --contains <sha>`); or a released CHANGELOG section, release note
   or merged PR names it; or `deployed:` is set. A commit is "for the issue"
   when its message or branch names it (`#0042`, `0042`), or when it ticked
   the issue's criteria or changed its status — issue files usually land with
   the code (`git log --format='%h %cs %s' -- <issue file>`). A file with
   uncommitted changes proves nothing this way: its last commit predates the
   work in it.
2. **Merged** — such a commit is on the default branch
   (`git merge-base --is-ancestor <sha> origin/main`), but no release
   contains it yet, or the repo has no releases. For work that needs no release
   (a routine, a harness change, docs, live content, an internal tool) this is
   as good as released.
3. **Present** — the code and tests the criteria name exist, the live page shows
   it, or `wip.md` logs it as finished.

Unticked criteria are no proof against: agents often leave a human check
unticked. Proof against is a `## Review` note reporting a problem, an open
`## Questions` that still decides something, a revert, or a newer issue
reopening it.

Then read what a `## Review` still asks for. It is one of:

- **A look** — look at it, try it once, run a spec, sign off copy that's live.
  It closes with the release.
- **A human task** — something with consequences that only the maintainer can
  do: a deploy, a console upload, a legal or tax confirmation, rotating a secret,
  a reply to send.
- **A wait** — on another issue, a date or a fact. Check that other issue first;
  what it waits for may have happened long ago.

Then look for signs the issue is no longer worth its slot:

- **Duplicate** — another live or archived issue with the same intent
  (overlapping title, slug or criteria; the same `Concept:` in an archived
  `## Why rejected`). Keep the older or more complete one.
- **Outdated** — the behavior already exists under another issue, an ADR or
  PRD decision contradicts it, the code it names is gone, or its project
  shipped or was dropped without it.
- **Stale** — `in-progress` with no related commit or file change for 14
  days; `todo` untouched for 90 days; `backlog` without a `## Gate`;
  `assignee: human` with a `## Questions` section unanswered for 30 days.
- **Unblocked** — `blocked` whose `parent:` is `done` or archived.

The ages are defaults; follow AGENTS.md if it sets others.

## 3. Classify and report

| Bucket | When | Action |
|---|---|---|
| **Close** | Any open status, shipped by the evidence above, at most a look left, nothing against it | → `done` |
| **Task** | Shipped, but a human task is left | → `todo` + `assignee: human`, saying exactly what's left |
| **Unblock** | `blocked` whose parent is `done` or archived | → `todo`, keep `parent:` |
| **Archive** | `wontfix` with a `## Why rejected`, from any project; `done` that is standalone or whose project shipped | move to `_archive/` |
| **Ship** | A project with no open issue, whose `wip.md` was read and names nothing unfinished | `Status: shipped` |
| **Clarify** | The state rests on a fact only the maintainer knows, or the issue's text looks out of date | step 5, a step-by-step session |
| **Ask** | Duplicate, outdated, nobody plans it, or evidence that conflicts | step 5 |
| **Leave** | Healthy, or not shipped yet with nothing against it; the next release closes it | — |

**Check before you ship a project.** Shipping archives its done issues, and an
archived issue nobody looks at again. Read the `wip.md` first: an unticked line
without an issue, or an open issue its Current focus names, is a leftover, even
when no issue carries the project's name. A leftover keeps the project open.
Never archive `done` issues by age alone.

Report counts per bucket and the board by status, then one row per issue that
would change: id, title, `status → proposed`, the evidence in a few words,
age. In report mode, stop here.

## 4. Apply the clear cases

Close, Task, Unblock, Archive and Ship need no question — the evidence decides:

- Change only the `status:` line (plus `assignee:` on Task, and `deployed:` when
  the deploy date is really known). Never set `reviewed:` — that marker means a
  human looked, and grooming is not that.
- Append one line under a `## Groomed (YYYY-MM-DD)` section, so the move is
  explained and the maintainer can reverse it:
  `in-review → done: shipped in v1.4.0 (a1b2c3d); only a look-check was left.`
- Archive with `git mv` into `.agents/issues/_archive/` to keep history, and
  rewrite the links that pointed at the file.
- For each touched project, add one `wip.md` activity entry summarizing the
  grooming, tick its checklist lines and bring its Current focus up to date. A
  `wip.md` that still says "in review" misleads the next session.

## 5. Ask about the rest

Ask in the chat's own question UI — `AskUserQuestion` in Claude Code, the
equivalent elsewhere; only without one, a numbered list in chat. Never bury
the questions in a report.

- **Recommend.** First option is your recommendation, labelled
  "(Recommended)", with the evidence in its description.
- **Group.** One question per group sharing a cause and a recommendation —
  "12 in-review issues are merged and fully ticked, but no release contains
  them. Move all to done?" — with options such as *all*, *pick one by one*,
  *leave them*. Ask per issue only for groups of one or contested cases. Up to
  four questions per call; biggest groups first.
- **Clarify step by step.** When a group's wait rests on facts only the
  maintainer knows, ask whether it really still waits. Start a step-by-step
  session (the `step-by-step-guide` skill if the harness has it): one question at
  a time, apply each answer right away, and leave the issues, the project's
  `wip.md` and any doc that named the old state true.
- **Typical recommendations:**
  - Merged, not released, needs a release → leave it; the next release closes it.
  - Stale `in-progress` → back to `todo` · keep · to the ideas.
  - Old `todo`, or `backlog` without a gate → to the ideas · keep · start now.
  - A project that never started → to the ideas · pause · keep.
  - Duplicate → `wontfix` + archive, pointing at the survivor · fold its
    criteria into the survivor first · keep both · delete.
  - Outdated → `wontfix` + archive · rewrite and keep · delete.
  - Unanswered `## Questions` → keep · to the ideas · `wontfix`.
- **What stays open gets done.** If the maintainer keeps an issue, offer to start
  it now in a session of its own instead of letting it wait again.
- **Delete sparingly.** Recommend deleting only a file with nothing worth
  keeping (an empty template, an accidental copy), and only on an explicit
  choice in this run; use `git rm`. Otherwise `wontfix` + archive — the
  archive is the institutional memory.
- **`wontfix`** always gets the `## Why rejected` section from triage. For a
  duplicate: "Duplicate of #NNNN".
- Apply each answer right away, by the rules in step 4.

### Move to the ideas

Not planned in the short term means no PRD and no issue. An idea lives in one of
two PRDs, `.agents/projects/NN-product-ideas/prd.md` (features, growth, content)
and `.agents/projects/NN-engineering-ideas/prd.md` (performance, refactors,
infrastructure). Both are projects with `Status: paused`; create them from
`to-prd`'s templates when they don't exist.

- **An issue:** add a section with what, why, when to reconsider and a link to
  the issue. Give the issue a `## Why rejected` whose reason points at that PRD,
  set `wontfix`, and archive it.
- **A project:** add a section the same way, move its `prd.md` and `wip.md` to
  `parked/<slug>-prd.md` and `parked/<slug>-wip.md` in the ideas project, rewrite
  their relative links and the links pointing at them, and remove the empty
  folder.
- **Planned work that waits for a trigger stays an issue:** `blocked` with a
  `parent:` when it waits on an issue, `backlog` with a `## Gate` section naming
  the trigger otherwise.
- **Promote** an idea when it gets planned: file the issue or open the project,
  and delete its section.

## 6. Summarize

- What moved, archived, deleted, was asked and left — with the board before
  and after (e.g. "in-review 38 → 4").
- What still waits on the maintainer: each remaining `in-review` issue, and each
  new `todo` + `assignee: human` with what's left.
- Don't commit unless asked; suggest one commit, "Groom issues (YYYY-MM-DD)".

## Daily sweep

Grooming a little every day keeps the board clean; a big pass every few months
doesn't. A routine runs the same rules unattended:

1. Collect, gather evidence and classify as above, every day.
2. Apply the clear cases itself (step 4), naming the evidence on every move.
3. It can't ask, so what it can't settle becomes an **open decision** in its run
   log: grouped, recommended, at most about four new ones a day so the maintainer
   can answer them in one round. The rest waits for a later day. A `clarify` group
   becomes an interview decision that proposes a step-by-step session.
4. Issues it kept, and issues a live decision holds, stay quiet for a few weeks.
5. Its note leads with what it did and what's left for the maintainer: "3 closed
   · 1 to you", not the size of the queue.
