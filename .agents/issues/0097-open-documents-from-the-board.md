---
id: 0097
title: Read linked markdown files inside loopboard and see which links are broken
category: user-story
status: backlog
assignee: agent
project: 04-harness-tree
phase: 4
parent: 0073
labels: [ui, server, navigation]
created: 2026-10-13
---

## User story

As a **person whose work results are documents — notes, a checklist, a
draft**, I want **a link in an issue to a markdown file to open inside
loopboard, and a link that points nowhere to say so**, so that **the issue
is the way to the file and reading it doesn't lose my place**.

## Acceptance criteria

- [ ] A relative link in an issue, a PRD or a WIP is resolved relative to the file that contains it; a markdown target inside the harness folder opens in a read-only document view in loopboard, with a way back to where you were
- [ ] A `<id>:<path>` reference to a markdown file opens the same view for that harness
- [ ] A target that is missing or lies outside the harness folder is marked as broken, shows its resolved path, and offers no action
- [ ] Rendering a link checks that the file exists without reading it, so a cloud placeholder isn't downloaded just because an issue was opened
- [ ] The read path for files next to `.agents/` serves markdown only, and only when the file's real path lies inside a registered harness folder: `..`, an absolute path and a symlink that leads out are refused, each with a test
- [ ] `loopboard check` warns about relative links in issues, PRDs, WIPs and `INDEX.md` that point at no file
- [ ] An e2e test opens a linked markdown file and shows a broken link as broken; spec § 5 gains the scenarios

## Out of scope

- "Open" and "Reveal" for files that aren't markdown — #0110
- Rendering PDFs, images or office files inside the board — they open in the system's app
- Editing the opened markdown file — the document view is read-only here; the editor covers issues, PRDs, WIPs and specs
- Uploading or attaching files — a document lives in the harness folder and is linked
- Links that leave the harness folder — written as a `<id>:<path>` reference into the harness that holds the file

## Notes

- PRD stories 48, 50. Builds on #0073, which stops relative links from
  throwing you back to the start page and sanitises rendered markdown; this
  issue gives those links somewhere to go.
- Also needs #0084, which renders `<id>:<path>` references.
- The document store only serves markdown under the root (`.agents/`); files
  in the harness folder next to it need their own read path with the
  inside-the-harness rule above.
- "Open in editor" stays a link to the editor's URL scheme, as today.
- Split in the review round: starting the system's apps is #0110.
