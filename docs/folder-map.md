# What lives where

```text
your-repo/
├─ AGENTS.md              how agents work here (a managed "Workflow" block + your rules)
├─ CLAUDE.md              imports AGENTS.md for Claude Code
├─ .claude/skills/        links to .agents/skills (and .cursor/skills if you use Cursor)
└─ .agents/
   ├─ skills/             grill-me, to-prd, to-issues, implement, triage, issue-grooming, upgrade-harness, routine, …
   ├─ issues/             NNNN-slug.md — one vertical slice each; _archive/ for closed ones
   ├─ projects/           NN-slug/prd.md + wip.md — work with several decisions
   ├─ scheduled/          <slug>/routine.md + runs.md — routines a dispatcher runs
   ├─ specs/              what the product does, with E2E coverage tables
   ├─ architecture/       how it's built; decisions/ holds ADRs
   ├─ rules/              coding standards, loaded only when a task matches
   └─ design/             brand kit and design references for UI work
```

Everything is plain markdown in your repo: agents read and write it, git
keeps the history, and loopboard only shows it and edits a few fields.
