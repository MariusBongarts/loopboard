---
id: 0073
title: Relative links in issue and PRD bodies throw you back to the start page
category: bug
status: todo
assignee: agent
labels: [ui, navigation]
created: 2026-10-13
---

## Steps to reproduce

1. Open an issue whose body contains a relative markdown link, e.g.
   `[the PRD](../projects/01-open-source-launch/prd.md)` or
   `[#0012](0012-some-issue.md)`.
2. Click the link.

## Current behavior

The browser follows the relative href, the server's SPA fallback answers,
and you land on `/` — the issue you were reading is gone. The issue body only
handles `#NNNN` reference buttons and task checkboxes; ordinary anchors are
not intercepted. Rendered markdown is also inserted unsanitised.

On a real workspace 430 issues contain relative links; in document-heavy
workspaces most issues will.

## Expected behavior

A click on a link inside rendered markdown never loses your place: links to
issues open the issue, other relative links resolve to a file path you can
copy or open in your editor, and external links open in a new tab.

## Acceptance criteria (verification)

- [ ] Clicking a relative link never navigates away from the current view
- [ ] Links that point at an issue file open that issue, from issue bodies
  as well as from PRD/WIP documents
- [ ] Other relative links show the resolved path with "Copy path" and
  "Open in editor"
- [ ] External `http(s)` links open in a new tab with `rel="noopener"`
- [ ] Rendered markdown is sanitised (no script, no inline event handlers)
- [ ] An e2e test covers an issue link, a non-issue relative link and an
  external link

## Out of scope

- Rendering non-issue documents inside the board
- Rewriting existing links in files

## Notes

- PRD/WIP documents already resolve issue links through a shared click
  delegate; issue bodies don't use it yet.
