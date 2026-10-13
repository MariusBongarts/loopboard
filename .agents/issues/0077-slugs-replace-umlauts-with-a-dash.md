---
id: 0077
title: Slugs replace umlauts with a dash
category: bug
status: todo
assignee: agent
labels: [server, data]
created: 2026-10-13
---

## Steps to reproduce

1. Create an issue from the board titled "Größe der Übersicht ändern".
2. Create a project with the same title.
3. Register a folder named "Büro" as a workspace.

## Current behavior

- The issue file is `NNNN-gr-e-der-bersicht-ndern.md` and the project folder
  `NN-gr-e-der-bersicht-ndern`.
- The workspace id is `b-ro`, and so is its URL (`/w/b-ro`). If the folder
  name arrives decomposed (`u` plus a combining diaeresis), the id is `bu-ro`
  instead — two ids for the same name.

The slug function lowercases the text and turns every run of characters
outside `a-z0-9` into one dash, so `ä`, `ö`, `ü`, `ß` and every other
accented letter disappear. The slugs are valid, but unreadable — and file
names and ids are what people and agents search for.

## Expected behavior

Slugs stay readable: `NNNN-groesse-der-uebersicht-aendern.md`,
`NN-groesse-der-uebersicht-aendern`, `buero`.

## Acceptance criteria (verification)

- [ ] `ä` → `ae`, `ö` → `oe`, `ü` → `ue`, `ß` → `ss`, in either case, for issue file names, project folders and workspace ids
- [ ] Other accented Latin letters keep their base letter (`é` → `e`, `ñ` → `n`) instead of becoming a dash
- [ ] Precomposed and decomposed input give the same slug (macOS hands out folder names in either form)
- [ ] The slug function stays the single implementation behind issue file names, project folders, workspace ids and the `id` that `init` writes into an identity file (#0078); the 60-character cut for issue and project slugs is applied after transliteration and never ends on a dash
- [ ] Nothing that exists is renamed: registered workspaces keep their id, existing files keep their names
- [ ] Regression tests cover the three reproduction steps, a decomposed `ü`, and a title whose slug only passes 60 characters once its umlauts are written out

## Out of scope

- Renaming existing files, folders or workspace ids
- Allowing non-ASCII characters in issue file names — the pattern stays; #0071 reports what the reader skips
- Scripts that have no common Latin transliteration

## Notes

- Do this before a tree of harnesses is created, and before #0078: the id
  `init` writes into an identity file is the folder's slug, it never changes
  afterwards, and ids end up in references.
- Apply the four German mappings before stripping accents; a plain accent
  strip would turn `ü` into `u`.
