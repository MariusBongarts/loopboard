---
id: 0025
title: Splice edited markdown blocks back into the original file
category: task
status: done
assignee: agent
project: 01-open-source-launch
phase: 6
labels: [editor]
created: 2026-10-04
---

## What needs to change

A deep module that parses a markdown body into top-level blocks with source
offsets and, given the original text plus the editor's document, re-serializes
only the blocks that changed and splices them into the original. Inserted and
deleted blocks are handled; untouched blocks stay byte-exact.

## Why

The WYSIWYG editor (#0026) would otherwise normalize list markers, table
padding and escapes on every save, producing noisy git diffs and rewriting
agent-authored formatting.

## Acceptance criteria

- [x] Round-trip with no edits returns the input unchanged for every fixture file and every file in this repo's `.agents/`
- [x] Editing one block changes only that block's lines (diff assertion)
- [x] Insert, delete and reorder of blocks produce minimal diffs
- [x] Constructs the serializer can't round-trip (e.g. complex tables, HTML blocks) are reported so the editor can lock them to Source mode

## Out of scope

- The editor UI — #0026

## Notes

- PRD story 30. Pick the markdown AST library together with the editor choice in #0026 (they must agree on the block model).

## Outcome

- `src/splice.ts`: top-level blocks from `marked.lexer` (their raws reconstruct all 130 repo docs exactly); "unchanged" = same normalized rendered HTML, so formatting-only differences keep original bytes; LCS for inserts/deletes; the file keeps its original ending. Raw blocks (tables, HTML, link definitions) travel as `loopboard-raw` code blocks.
