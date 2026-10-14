---
id: 0090
title: Create recurring issues with loopboard recur
category: user-story
status: backlog
assignee: human
project: 04-harness-tree
phase: 2
parent: 0085
labels: [cli, workflow, conventions]
created: 2026-10-13
---

## User story

As a **maintainer with duties that come back every month, quarter or year —
a report to the accountant, a backup check, a renewal**, I want **one
command to create this period's issue with its due date, exactly once**, so
that **nobody has to remember to file it, and a scheduled agent task can run
the command as often as it likes**.

## Acceptance criteria

- [ ] A recurring duty is described once in the harness — how often (month, quarter, year), on which day it is due, how many days ahead its issue should exist, a title pattern with the period in it, the usual issue fields, and the issue body
- [ ] `loopboard recur [path]`, with `--harness <id>` or `--all` for every registered harness, creates for each duty the issue of the current period if it doesn't exist yet: next free number, `due:` set, `recurrence:` naming the duty and the period; it prints what it created
- [ ] It is idempotent: a second run creates nothing, and an issue that was closed or archived in the meantime is not created again — the match is the `recurrence:` value across live and archived issues
- [ ] `loopboard check` reports two issues that carry the same `recurrence:` value — two devices on one synced folder can each create the period's issue before the sync catches up
- [ ] Periods that were missed are listed, not back-filled; `--dry-run` prints what would be created and writes nothing
- [ ] The server never runs it: no timer and no route creates issues; the docs show how to call it from a scheduled agent task or from cron
- [ ] Unit tests cover the period maths: a day that doesn't exist in a month (the 31st), quarter starts, 29 February and the turn of the year
- [ ] The issues README (where `recurrence` loses its "reserved" marker), the glossary's "Issue" entry, `--help` and the README's CLI table document duties, the field and the command; spec § 10 gains the scenarios. No migration entry: a harness without duties has nothing to do

## Questions

Assigned to the maintainer because the contract reserves `recurrence:` and
names the command, but not where a duty is written down — and that is a new
place on disk.

1. **Where do duties live?** Proposal: one markdown file per duty in
   `.agents/recurring/<slug>.md` — frontmatter for the schedule and the
   issue fields, the body is the issue's body. Alternative: one list file
   per harness.
2. **What does `recurrence:` hold?** Proposal: `<slug>@<period>`, e.g.
   `monthly-report@2026-11`, `backup-check@2026-Q4`, `yearly-review@2026`.
3. **Missed periods** are only listed (proposal above), or should
   `--catch-up` create them?

## Out of scope

- Weekly duties and the week numbering they need — month, quarter and year cover what is known today; deferred in `wip.md`
- A "create now" button for upcoming duties — deferred in `wip.md`
- Other schedules (cron expressions, "every second Tuesday")
- Closing or rolling over last period's issue — it stays what it is
- Starting an agent on the created issue — loopboard starts no agents

## Notes

- PRD stories 25–27. The server never creating issues on its own is a
  decision, not a limitation to work around: every file in a harness was
  written by the user or by something the user started.
- Also needs #0083: `--harness <id>` and `--all` find harnesses the way
  `where` does.
- Issue creation goes through the same allocator as `next-id`, so numbers
  don't collide with a parallel agent on the same machine. Across devices
  on a synced folder nothing can prevent a double — hence the `check`.
- In a docs harness nothing else produces due dates automatically — this is
  the main source of them, which is why it depends on #0085.
