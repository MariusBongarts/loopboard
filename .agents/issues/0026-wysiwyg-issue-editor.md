---
id: 0026
title: Edit issues in a WYSIWYG editor
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 6
parent: 0024
labels: [editor, ui]
created: 2026-10-04
---

## User story

As a **developer**, I want **to edit issues in a Linear-like rich-text editor, with frontmatter as form fields and `#` to link issues**, so that **small changes don't need my code editor and never break the YAML or the formatting**.

## Acceptance criteria

- [x] Rich-text editing (TipTap or Milkdown, decision recorded as an ADR) for headings, lists, checklists, links, code and quotes
- [x] Saves go through the block splice (#0025), so untouched lines stay byte-exact
- [x] A WYSIWYG/Source toggle; blocks the splice can't round-trip open in Source mode
- [x] Frontmatter is edited via fields (title, status, assignee, labels, project, parent), never in the rich-text surface
- [x] Typing `#` suggests issues by number/title and inserts `#NNNN`
- [x] Checklist items toggle with one click
- [x] Playwright: edit a checklist item and a paragraph, save, and assert the file diff is only those lines

## Out of scope

- Real-time collaborative editing

## Notes

- PRD stories 29, 32, 35. Also depends on #0025.

## Outcome

- TipTap 3 + official `@tiptap/markdown` (marked-based, same parser as the rest of the app). Fields form via `shared/frontmatter.ts` (line edits that keep trailing comments). `#` autocomplete built in RichEditor. Mode remembered per browser.
- Decision: fields and body save together in one hash-checked write (one Save, one conflict model) rather than instant field PATCHes.
