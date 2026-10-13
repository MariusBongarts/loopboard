---
id: 0082
title: Reference issues, projects and files in other harnesses and check them
category: user-story
status: todo
assignee: agent
project: 04-harness-tree
phase: 1
parent: 0079
labels: [cli, ids, conventions]
created: 2026-10-13
---

## User story

As a **maintainer and as an agent working across harnesses**, I want **one
way to write a reference to an issue, a project or a file in another harness,
and `loopboard check` to tell me when it points nowhere**, so that
**references are unambiguous although every harness counts from 0001, and
stay valid as things move**.

## Acceptance criteria

- [ ] One parser, shared by server, CLI and client, implements the syntax of the ADR from #0101 — `<id>#NNNN` for an issue, `<id>#PNN` for a project by number, `<id>:<relative/path>` for a file, aliases resolving like ids — and leaves fenced code, inline code, markdown link targets, URLs, email addresses and an issue's `source:` line alone
- [ ] A table-driven test pins what is and isn't a reference, including `github#1234`, a URL, a `mailto:` address, a Windows drive path, a YAML keyword in front of `#`, and `word:word` in ordinary prose
- [ ] `<word>:<path>` counts as a reference only when the word is a registered id or alias; the `#` forms count whenever the word is a valid id
- [ ] `loopboard check` resolves every qualified reference in `issues/`, `projects/` and `specs/` against the registered harnesses and prints one line per problem with file and reference: no such issue, no such project number, no such file
- [ ] `--strict` exits 1 for those. For the `#` forms, an id no registered harness has is listed as "not registered on this machine" and does not fail `--strict`; a registered harness whose folder is missing is listed as unreachable
- [ ] A qualified reference is never reported as a dangling local `#NNNN`, and a reference that uses the harness's own id or alias resolves locally
- [ ] In the issues README's "Reserved fields and references" section (#0101), the three reference forms lose their "from a later release" marker; spec § 10 gains the scenarios
- [ ] Vitest runs `check` against two registered temp harnesses with their own config directory, including an alias, an archived target and a file reference that tries to leave the harness folder

## Out of scope

- The ADR itself — #0101 decides the syntax before anything is written to disk
- Turning references into links in the board — #0084
- `loopboard where` and `loopboard resolve` — #0083
- Rewriting references in other harnesses when an issue is renumbered — deferred in `wip.md`; `check` in the other harness reports the broken reference
- `blocked-by:` and `waiting-on:` — phases 3 and 2; they reuse this parser
- A migration entry — unqualified references behave as before, so an existing harness has nothing to do

## Notes

- PRD stories 14–17. The syntax is backward compatible for `check` and for
  the linkifier of issue bodies: both only match `#NNNN` when it doesn't
  follow a letter or digit, so `shop#0412` is ignored by them until this
  lands. Two other matchers have no such guard — the one behind the issue
  buttons in WIP notes and the one that collects a phase's issues; #0100
  fixes them.
- Why an unknown id doesn't fail `--strict`: a public repo's CI has no
  registry, and a reference into a private harness is legitimate there. Why
  an unknown word before `:` isn't even listed: prose is full of
  `word:word`.
- `check` reads whole files, frontmatter included. That is how
  `source: github#1234` would turn into a reference to a harness called
  `github`; the ADR reserves the word and the parser skips the line.
- An archived issue is still a valid target.
- `<id>:<path>` is relative to the harness folder (the one that holds
  `.agents/`), not to `.agents/`.
- There is no unqualified project form; inside a harness a project is still
  named by its slug or linked.
