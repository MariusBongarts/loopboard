---
id: 0024
title: Edit an issue's markdown with conflict detection
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 6
parent: 0010
labels: [editor, server]
created: 2026-10-04
---

## User story

As a **developer**, I want **to edit an issue's markdown in the drawer and be warned if an agent changed the file meanwhile, with Reload, Compare and Overwrite**, so that **neither of us silently loses work**.

## Acceptance criteria

- [x] Document reads return content + content hash; writes send the base hash; a mismatch returns 409 with the current disk content
- [x] Writes are atomic (temp file + rename) and never leave partial files
- [x] The drawer gets an Edit mode (plain markdown source for now) with save (⌘S) and cancel
- [x] On 409 a banner offers Reload (discard mine), Compare (side-by-side diff) and Overwrite
- [x] If the open file changes on disk while there are no unsaved edits, it reloads silently
- [x] Vitest for the document store (conflict, atomic write); Playwright: edit → external write → conflict banner

## Out of scope

- Rich-text editing — #0026
- PRD/WIP/spec editing — #0027

## Notes

- PRD stories 31, 33. This source mode stays as the "Source" toggle once WYSIWYG lands.

## Outcome

- `server/docs.ts` (GET/PUT with content hashes, 409 + current content) and `DocEditor`; heads-up when the file changes under unsaved edits, silent follow otherwise, Compare via `src/diff.ts`.
- Found and fixed a data-loss race: typing before the document loaded was overwritten by the late load — the editor is now disabled until loaded.
