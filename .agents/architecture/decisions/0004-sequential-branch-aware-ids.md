# Keep sequential IDs; allocate them across all branches and worktrees

- **Status**: accepted — built in #0016, #0017, #0018
- **Date**: 2026-10-04

Issue (`NNNN`) and project (`NN`) numbers stay sequential and readable.
Collisions come from parallel agents in worktrees or branches each computing
`max + 1` from their own checkout. A single allocator — `loopboard next-id`,
used by skills and the UI — takes the max across the working tree, the
archive, every worktree, every local branch and the remote-tracking refs.
`loopboard check` catches what slips through (e.g. unfetched work) and
`loopboard renumber` rewrites a number everywhere it is referenced. Existing
repos need no migration.

## Considered options

- **Short random IDs with a slug** (`k7f2-crash-on-empty-wip.md`) —
  collision-free by construction, but loses ordered, speakable numbers.
  Considered and rejected during the launch-PRD grilling.
- **A committed counter file** — makes collisions loud as merge conflicts,
  but still needs manual renumbering.

## Consequences

loopboard stays a solo-developer tool: one machine holds all branches, which
is what makes the allocator reliable. Team support would need a different ID
model.
