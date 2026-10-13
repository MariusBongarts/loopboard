# Skills: instructions on demand

A skill is a folder with a `SKILL.md`: a name, a one-line description of when
to use it, and the instructions. Claude Code, Cursor and Codex keep only the
descriptions in mind; when what you ask matches one, the agent reads the whole
file and follows it. Longer reference material sits in files the skill links
to, loaded only when needed.

That keeps the context small and makes good process repeatable. Instead of
explaining how you want a PRD written every time, you say "write a PRD for
this" and `to-prd` does it the same way each time.

You don't call skills like commands — you ask in plain words:

| You say | Skill | What happens |
|---|---|---|
| "grill me on …" | `grill-me` | One question at a time until the plan has no open branches |
| "grill me, and keep the docs" | `grill-with-docs` | The same, and new terms and decisions land in the glossary and ADRs |
| "write a PRD for this" | `to-prd` | A project folder with `prd.md` and `wip.md` |
| "break it into issues" | `to-issues` | Vertical-slice issue files |
| "implement #0012" | `implement` | One issue end to end, verified |
| "move #0012 to backlog" | `triage` | Status and assignee changes by the rules |
| "groom the issues" | `issue-grooming` | Closes what shipped, archives what's finished, asks about stale or duplicate issues |
| "let's do this test-first" | `tdd` | Red, green, refactor — one behavior at a time |
| "diagnose this" | `diagnose` | Reproduce, minimise, hypothesise, instrument, fix |
| "upgrade my loopboard harness" | `upgrade-harness` | Merges new conventions into your copies |

Most of these come from Matt Pocock's
[mattpocock/skills](https://github.com/mattpocock/skills): small, composable
skills for real engineering rather than one giant prompt. loopboard adapts
them to local files and adds `implement`, `triage`, `issue-grooming` and
`upgrade-harness`.
Upstream has since moved on — `to-prd` is now `to-spec` and `to-issues` is
`to-tickets` — so his videos may use either name. Make your own skill with
`write-a-skill`.
