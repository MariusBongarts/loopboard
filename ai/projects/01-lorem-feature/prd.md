# Lorem Feature — PRD

> Drafted: 2026-05-01
> Status: in-progress

## Problem statement

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Users can't do X today.

## Solution

After this ships, users can do X in two clicks.

## User stories

1. As a **user**, I want to **do thing A**, so that **outcome A**.
2. As a **user**, I want to **do thing B**, so that **outcome B**.

## Implementation decisions

- **Storage.** Use the existing table. Adding a column beats a new table here.
- **API shape.** Single `POST /lorem` endpoint, JSON body.

## Testing decisions

- Integration tests against the endpoint with a real database.

## Out of scope

- Thing C — separate concern, not blocking.
