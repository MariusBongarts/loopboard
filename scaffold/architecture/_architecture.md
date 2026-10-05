# Architecture

> How this product is built. For what it does, see
> [`../specs/_specs.md`](../specs/_specs.md).

## Table of Contents

| Concern | Doc | Key code path |
|---|---|---|
| | | |

## Decisions (ADRs)

Hard-to-reverse choices, one file each in [decisions/](decisions/) (format:
the grill-with-docs skill's ADR-FORMAT.md).

| # | Decision |
|---|---|

## How to update these docs

- **No architectural shift** (bug fix, small refactor) — no update.
- **New module, route, collection or pipeline step** — add it to the
  relevant doc; point at code with `[file](relative/path)`.
- **New top-level concern** — a new doc plus a row above.
- **New ADR** — write it under `decisions/` and add a row above.

Keep each doc under ~150 lines; docs explain *why* and *where*, code explains
*what*.
