---
id: 0110
title: Open and reveal linked documents with the system's apps
category: user-story
status: backlog
assignee: agent
project: 04-harness-tree
phase: 4
parent: 0097
labels: [ui, server, security]
created: 2026-10-13
---

## User story

As a **person whose work results are documents — a contract, a spreadsheet,
a scan**, I want **a link in an issue to open the document in its app or
show it in the file manager**, so that **the issue is the way to the file**.

## Acceptance criteria

- [ ] A relative link or a `<id>:<path>` reference to a file that isn't markdown offers "Open" (the system's default app) and "Reveal" (the file manager)
- [ ] Both are POST routes that require an `Origin` header matching the app's own origin. A request without the header is refused — today's guard lets such a request through — and a test pins that
- [ ] They accept only a path whose real path lies inside a registered harness folder; `..`, an absolute path and a symlink that leads out are refused
- [ ] "Open" only runs for an allow-list of document types; anything that would execute can only be revealed
- [ ] The server starts one fixed command per platform, without a shell, and never puts the path into a command line as text
- [ ] Tests cover path traversal, a symlink that leads out, a foreign origin, a missing origin and a file type that isn't allowed; an e2e test shows both actions on a linked PDF without launching anything
- [ ] Spec § 5 gains the scenarios, and the architecture docs name the route next to the server's other guards

## Out of scope

- The in-app view for markdown files and broken-link marking — #0097
- Rendering PDFs, images or office files inside the board
- Opening files outside every registered harness folder
- Choosing the app — the system's default decides

## Notes

- PRD story 47. Split from #0097 in the review round, so the route and its
  security tests get a slice of their own.
- The server already runs `git` for id allocation and issue activity, and
  it opens the browser. This is the first time it starts a program on a
  path that comes from a request. ADR-0001 names the local server as an
  attack surface; this route needs the same care as the write routes, and
  then some.
- The existing origin check only looks at requests that aren't GET or HEAD,
  and it accepts a missing `Origin`. Don't loosen or reuse it as it is for
  these two routes.
