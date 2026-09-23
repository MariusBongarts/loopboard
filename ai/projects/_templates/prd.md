# {Project Title} — PRD

> Drafted: YYYY-MM-DD
> Status: in-progress | shipped | paused

## Problem statement

The problem the user (or the system) is facing, framed from the affected actor's
perspective. Two or three sentences. Avoid implementation language.

## Solution

The solution from the affected actor's perspective. What will be true once this
project ships? Avoid implementation language.

## User stories

A long, numbered list of user stories. Each story uses the form:

1. As an **<actor>**, I want **<feature>**, so that **<benefit>**.
2. ...

This list is extensive — every user-visible behavior change should appear here.
Stories that map to standalone vertical slices will become individual
`ai/issues/NNNN-...md` files.

## Implementation decisions

Locked architectural / technical choices made up-front. Each decision should
state the tradeoff:

- **Decision 1.** What we picked, and why over the alternative we considered.
- **Decision 2.** ...

Avoid file paths and code snippets — they go stale. Decisions describe
interfaces, contracts, schema shapes, integration points.

## Testing decisions

- What does a good test look like for this project? (Behavioral, public-API,
  integration-style — see `.agents/skills/tdd/tests.md`.)
- Which modules will be tested?
- Prior art: similar tests already in the codebase?

## Out of scope

Explicit boundaries. Things that look related but will not ship in this project.
Each entry should explain *why* it was deferred so future readers (and
`grill-with-docs` sessions) don't re-litigate.

## Further notes

- Domain language reminders (link to `ai/specs/00-conventions-and-glossary.md`
  if a new term is introduced).
- Open questions that surfaced during the kickoff but were resolved later;
  superseded answers are removed (the PRD reflects current intent).
