# Ipsum Cleanup — PRD

> Drafted: 2026-05-08
> Status: in-progress

## Problem statement

Lorem ipsum dolor sit amet. The ipsum module has drifted and a known bug
is affecting users.

## Solution

Tidy the module and fix the bug. No user-visible surface change beyond
the fix.

## User stories

1. As a **user**, I want **ipsum to render correctly**, so I'm not
   confused by a broken icon.

## Implementation decisions

- **Refactor first, fix second.** The refactor makes the bug fix a
  one-liner.

## Testing decisions

- Unit tests for the refactored module. Regression test for the bug.

## Out of scope

- Redesigning the ipsum UI — separate project.
