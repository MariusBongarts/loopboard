---
name: issue-grooming
description: Groom the whole board — check every issue that isn't archived (backlog, todo, in-progress, in-review, blocked, and done ones left on the board) against what actually happened in git, merged PRs, releases and deploys; close what shipped, archive what's finished, and flag stale, duplicate or outdated issues, asking the maintainer with a recommendation whenever unsure. Use when the user says "groom the issues", "groom the backlog", "clean up the board", "too much is stuck in review", "what's stale?", or after a release, a deploy or a project ship.
---

# Issue grooming

Boards drift from reality in predictable ways: `in-review` waits for a check
nobody runs while the change ships anyway; `in-progress` outlives its session;
`blocked` outlives its parent; old `todo` and `backlog` items get duplicated
or overtaken. Grooming reconciles every live issue with what really happened,
fixes the clear cases itself and asks about the rest.

Statuses, assignee and body sections follow
[`.agents/issues/README.md`](../../issues/README.md); transitions and the
`## Why rejected` template follow the [`triage`](../triage/SKILL.md) skill.
Read both first.

Modes:

- **Report** — "what's stale?", "dry run", or the first run in a repo:
  steps 1–3, write nothing.
- **Groom** — all steps.

## 1. Collect

- **Live issues**: every `.agents/issues/*.md` (not `_archive/`), any status.
  Per issue: frontmatter, acceptance criteria ticked/total, which of
  `## Review`, `## Questions`, `## Why rejected` exist, `created:`, and the
  last change to the file (`git log -1 --format=%cs -- <file>`).
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
   the code (`git log --format='%h %cs %s' -- <issue file>`).
2. **Merged** — such a commit is on the default branch
   (`git merge-base --is-ancestor <sha> origin/main`), but no release
   contains it yet, or the repo has no releases.
3. **Present** — every acceptance criterion is ticked, the code and tests the
   criteria name exist, and `wip.md` logs it as finished.

And for proof against it: a `## Review` note reporting a problem, open
`## Questions`, unticked criteria, a revert, or a newer issue reopening it.

Then look for signs the issue is no longer worth its slot:

- **Duplicate** — another live or archived issue with the same intent
  (overlapping title, slug or criteria; the same `Concept:` in an archived
  `## Why rejected`). Keep the older or more complete one.
- **Outdated** — the behavior already exists under another issue, an ADR or
  PRD decision contradicts it, the code it names is gone, or its project
  shipped or was dropped without it.
- **Stale** — `in-progress` with no related commit or file change for 14
  days; `todo` or `backlog` untouched for 90 days; `assignee: human` with a
  `## Questions` section unanswered for 30 days.
- **Unblocked** — `blocked` whose `parent:` is `done` or archived.

The ages are defaults; follow AGENTS.md if it sets others.

## 3. Classify and report

| Bucket | When | Action |
|---|---|---|
| **Close** | Any open status with **released** evidence, every criterion ticked, nothing against it | → `done`; set `deployed:` to the release date if missing |
| **Unblock** | `blocked` whose parent is `done` or archived | → `todo`, keep `parent:` |
| **Archive** | `done`, or `wontfix` with a `## Why rejected`, that is standalone or whose project shipped | move to `_archive/` |
| **Ask** | Merged but unreleased, stale, duplicate, outdated, or evidence that conflicts | step 5 |
| **Leave** | Healthy, or in-review with a real pending check and no evidence it shipped | — |

Report counts per bucket and the board by status, then one row per issue that
would change: id, title, `status → proposed`, the evidence in a few words,
age. In report mode, stop here.

## 4. Apply the clear cases

Close, Unblock and Archive need no question — the evidence decides:

- Change only the `status:` line (plus `deployed:` on Close). Never set
  `reviewed:` — that marker means a human looked, and grooming is not that.
- Append one line under a `## Groomed (YYYY-MM-DD)` section, so the move is
  explained:
  `in-review → done: shipped in v1.4.0 (a1b2c3d).`
- Archive with `git mv` into `.agents/issues/_archive/` to keep history.
- For each touched project, add one `wip.md` activity entry summarizing the
  grooming.

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
- **Typical recommendations:**
  - Merged, not released → `done` · keep in review · back to `todo`.
  - Stale `in-progress` → back to `todo` · keep · `backlog`.
  - Old `todo` / `backlog` → `backlog` · keep · `wontfix`.
  - Duplicate → `wontfix` + archive, pointing at the survivor · fold its
    criteria into the survivor first · keep both · delete.
  - Outdated → `wontfix` + archive · rewrite and keep · delete.
  - Unanswered `## Questions` → keep · `backlog` · `wontfix`.
- **Delete sparingly.** Recommend deleting only a file with nothing worth
  keeping (an empty template, an accidental copy), and only on an explicit
  choice in this run; use `git rm`. Otherwise `wontfix` + archive — the
  archive is the institutional memory.
- **`wontfix`** always gets the `## Why rejected` section from triage. For a
  duplicate: "Duplicate of #NNNN".
- Apply each answer right away, by the rules in step 4.

## 6. Summarize

- What moved, archived, deleted, was asked and left — with the board before
  and after (e.g. "in-review 38 → 4").
- What still waits on the maintainer: each remaining `in-review` issue and
  what to check.
- Don't commit unless asked; suggest one commit, "Groom issues (YYYY-MM-DD)".
