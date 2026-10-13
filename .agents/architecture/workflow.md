# Workflow

How this repo is built: the same workflow loopboard ships, used on itself.

## Pieces

| Piece | Where | Role |
|---|---|---|
| Agent instructions | [AGENTS.md](../../AGENTS.md) (CLAUDE.md imports it) | Session loop, general rules, trigger-based rules |
| Skills | [.agents/skills/](../skills/), linked from `.claude/skills` and `.cursor/skills` | grill-me, grill-with-docs, to-prd, to-issues, implement, triage, issue-grooming, upgrade-harness, plus extras ([credits](../../CREDITS.md)) |
| Migrations | [MIGRATIONS.md](../../MIGRATIONS.md); level marker in AGENTS.md | Numbered workflow changes that running harnesses apply with upgrade-harness |
| Projects | [.agents/projects/](../projects/) | PRD (contract) + WIP (journal) per multi-decision effort |
| Issues | [.agents/issues/](../issues/) | One vertical slice each; status + assignee in frontmatter |
| Specs | [.agents/specs/](../specs/) | User-facing behavior and E2E coverage |
| Architecture | this folder | How it's built; ADRs for hard-to-reverse calls |
| Rules | [.agents/rules/](../rules/) | Coding standards loaded by AGENTS.md triggers |
| Design | [.agents/design/](../design/) | The Brand Kit: tokens, type, components and UI rules, rendered from the live stylesheet |

## The loop

```
grill-me ─▶ to-prd ─▶ to-issues ─▶ implement ─▶ done ─────────▶ archive on
 (decide)   (PRD+WIP)  (slices)     (one slice,  (verified;      project ship
                                     verify, log) reviewed:/deployed: optional)
                                        └─▶ in-review + human (needs a human check)
```

The agent closes what it can verify itself and flips `assignee: human`
instead of moving status backward when it needs input. `in-review` always
means "waiting on the maintainer".

## What other repos get

`loopboard init` copies the shipped parts of this repo into another repo: the
core skills (plus extras on request) with their
[CREDITS.md](../skills/CREDITS.md), the issues and projects READMEs and
templates, and the generic starters in [scaffold/](../../scaffold/) (specs,
architecture, rules, design, `SETUP.md`, the AGENTS.md skeleton). The
**managed block** ([scaffold/AGENTS.block.md](../../scaffold/AGENTS.block.md))
is the workflow section of every harness's AGENTS.md — this repo's own
AGENTS.md embeds it verbatim, and a test keeps them identical.

## Changing the workflow

A change to the conventions (statuses, loop, READMEs, skills) ships as a new
entry in [MIGRATIONS.md](../../MIGRATIONS.md) in the same change, and this
repo's AGENTS.md marker moves to it. Running harnesses pick it up with the
upgrade-harness skill.

## Why skills live in `.agents/`

One folder holds everything agents use, and `.claude/skills` and
`.cursor/skills` are symlinks into it, so every tool reads the same files.
`init` (#0011) reproduces this layout in other repos
([ADR-0003](decisions/0003-dot-agents-root-with-detection.md)).
