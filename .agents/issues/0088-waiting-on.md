---
id: 0088
title: Say who owes a reply with waiting-on
category: user-story
status: backlog
assignee: human
project: 04-harness-tree
phase: 2
parent: 0087
labels: [ui, data, conventions]
created: 2026-10-13
---

## User story

As a **maintainer whose work often waits on someone outside — the
accountant, a wedding venue**, I want **an issue to say
`waiting-on: "@accountant"` and the board to show "Waiting on the accountant
since 2 Oct"**, so that **I see who owes me a reply and for how long,
without inventing an assignee the board doesn't know**.

## Acceptance criteria

- [ ] An optional `waiting-on: "@id"`, or a list of them, is read from the frontmatter and returned by the API
- [ ] Cards, list rows and the issue view show "Waiting on" with the object's name and the date it has been waiting since; an id that resolves to no object is shown as written, marked as unknown
- [ ] "Waiting on" means people and organisations only. The badge and the board toggle for an unfinished parent issue are renamed from "waiting on" and "Hide waiting" to "blocked by" and "Hide blocked", and "Hide blocked" doesn't hide an issue that only waits on a person
- [ ] The assignee is untouched: `waiting-on` neither changes who drives the issue nor adds a value to the assignee vocabulary. How such an issue shows under "Needs you" follows the answer to question 3
- [ ] `loopboard check` reports a `waiting-on` id that matches no object — only in a harness that resolves an objects folder. Otherwise the check is skipped, and it never fails `--strict` without a registered top node
- [ ] The issue templates, the issues README (where the field loses its "reserved" marker), `docs/statuses.md` and the glossary — "Issue", "Waiting on", "Blocked by" — document the field in its quoted form. No migration entry
- [ ] Tests cover reading one value and a list, the unknown id and the renamed toggle; spec § 3 and § 5 gain the scenarios, and "Hide issues that are waiting" is renamed with the toggle

## Questions

Assigned to the maintainer because the contract doesn't say where "since"
comes from, and because "Needs you" and "waiting on" pull in different
directions.

1. **Where is the "since" date stored?** Proposal: an optional
   `waiting-since: YYYY-MM-DD` next to `waiting-on`, written by the picker
   (#0107) and by agents when they set the field; without it the board falls
   back to the issue's `created` date. Alternatives: derive it from git (not
   available in a docs harness) or from the file's modification time (wrong
   after any other edit). This adds a field to the contract.
2. **One date or one per entry** when an issue waits on two parties?
   Proposal: one date for the issue.
3. **Does an issue with `waiting-on` still count as "Needs you"?** The PRD's
   own example is `assignee: human` plus `waiting-on` — by the rule from
   #0074 it needs you, although the next move is the accountant's.
   Proposal: the count rule stays as #0074 defines it, but every "Needs you"
   list, and later the Overview, shows such issues in a separate "Waiting on
   others" group with the name and the since date. Alternative: an issue
   with `waiting-on` leaves "Needs you" until the field is cleared.

## Out of scope

- The picker in the issue view and the "Waiting on" filter in the list — #0107
- Reminders or follow-up drafts when something has waited too long
- Whom each harness waits on, on the Overview — #0092
- A page per person with everything that waits on them — #0089

## Notes

- PRD stories 29, 30. Today any assignee other than `agent` or `human`
  silently becomes `agent`, so "assigned to the accountant" can't be
  expressed and must not be.
- Why the rename belongs here: the board already prints "waiting on" with an
  issue number for an open `parent:` and has a "Hide waiting" toggle. This
  issue is the first to give "waiting on" a second meaning, so it is the one
  that has to separate them. #0091 keeps the new names.
- The value has to be quoted: YAML doesn't allow a plain value to start with
  `@`, and an unquoted one makes the whole frontmatter unparseable — the
  issue then disappears from the board until #0071 lands. The templates and
  the README show the quoted form.
- `status: blocked` plus `waiting-on` is the natural pair for "nothing I can
  do until they answer"; the field works with any status.
