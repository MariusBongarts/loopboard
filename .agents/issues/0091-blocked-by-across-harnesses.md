---
id: 0091
title: Block an issue on several issues, also in other harnesses
category: user-story
status: backlog
assignee: agent
project: 04-harness-tree
phase: 3
parent: 0082
labels: [ui, structure, conventions]
created: 2026-10-13
---

## User story

As a **maintainer whose work crosses harnesses — the company's announcement
waits on the shop's release and on two local issues**, I want **an issue to
list all its blockers, wherever they live, and to show what it blocks in
turn**, so that **I and my agents pick work that is really unblocked, and I
know what finishing something unlocks**.

## Acceptance criteria

- [ ] An optional `blocked-by: [0029, shop#0412, shop#P04]`, written flow-style on one line, is read from the raw frontmatter line, so local numbers keep their leading zeros (#0059), and returned by the API; `parent:` stays valid and counts as one more blocker. `loopboard check` reports a `blocked-by` written any other way — in a block-style list YAML reads `0042` as 34
- [ ] The issue view lists every blocker with status and title — foreign ones with their harness's name — and a "Blocks" list of the issues that name this one, including issues in other harnesses
- [ ] "Blocked" — the badge on the card and in the issue view, and the board's "Hide blocked" toggle, both renamed in #0088 — considers all blockers: an issue is blocked while any of them is open
- [ ] A blocker loopboard can't reach (id not registered, folder missing, no such issue) counts as unknown: shown as such, and the issue stays blocked; a project as blocker counts as done when its WIP says shipped
- [ ] `loopboard check` validates every entry — local numbers against this harness, qualified ones like any other reference — and reports a cycle
- [ ] `loopboard renumber` rewrites the number in the `blocked-by:` lists of the same harness, with a test: the issues README promises that renumber fixes every reference
- [ ] The issue-grooming skill's Unblock rule and the implement skill's pick consider `parent:` and every `blocked-by` entry; a blocker that is unknown counts as still blocking
- [ ] "Copy agent prompt" names an issue's open blockers, qualified where they are foreign, so the agent can look them up with `loopboard resolve`
- [ ] The issue templates, the issues README (where the field loses its "reserved" marker), `docs/statuses.md` and the glossary's "Issue" entry document the field and say that `parent:` remains the single local blocker. No migration entry. Unit tests cover the blocker index, an e2e test a cross-harness blocker; spec § 3 ("See what blocks an issue") and § 5 are updated

## Out of scope

- A picker to add or remove blockers in the board — deferred in `wip.md`; until then agents and the editor write the line
- Dependencies declared on a project (a line in the WIP header) — deferred in `wip.md`; an issue can already be blocked by a project
- The Connections section of the Overview — #0093
- Changing an issue's status in the board when its blockers finish — loopboard shows; the grooming skill proposes the move
- Rewriting `blocked-by` entries in other harnesses when an issue is renumbered — deferred in `wip.md`; `check` there reports the break

## Notes

- PRD stories 35–38. This re-states #0028, which kept `parent:` as the only
  relation. `parent:` isn't deprecated: one local blocker is still the common
  case and every existing harness uses it.
- Local entries are bare digits, not a `#` and four digits: a `#` after a
  space starts a YAML comment and would cut the list.
- The grooming skill unblocks on `parent:` alone today, so it would move a
  `blocked` issue to `todo` while `blocked-by` entries are still open. And
  `renumber` rewrites `#NNNN` mentions and `parent:`, but not bare digits in
  a list. Both have to learn the field in the same change that makes
  loopboard read it.
- The "Blocks" list needs a reverse lookup over other harnesses'
  frontmatter. It extends the harness index from #0084 by this one field —
  never a full workspace load.
- The existing relation index treats a missing parent as blocking forever;
  keep that meaning for unknown blockers and say why in the UI.
- Skill, README and template wording is shipped text; upgrade-harness merges
  it into existing harnesses.
