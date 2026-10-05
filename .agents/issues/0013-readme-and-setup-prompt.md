---
id: 0013
title: Rewrite the README around the quick-setup prompt
category: user-story
status: in-review
assignee: human
project: 01-open-source-launch
phase: 3
parent: 0011
labels: [docs, setup]
created: 2026-10-04
---

## User story

As a **visitor on GitHub**, I want **a README that gives me a copy-paste setup prompt and explains the loop and the harness**, so that **I can adopt the workflow in minutes and understand what my agent is doing**.

## Acceptance criteria

- [x] The setup prompt (about 5 lines: run `npx loopboard init`, follow `.agents/SETUP.md`, run `npx loopboard`) lives in one docs file and is embedded in the README
- [x] README sections: what it is (+ hero image slot for #0036), quick setup, the loop (grill → PRD → issues → implement → review → done), the harness (AGENTS.md + skills + `.agents/`), CLI reference, contributing, credits
- [x] Docs for the loop, folder map and statuses live in the docs folder so the Help page (#0014) reuses them
- [ ] A fresh agent session in an empty repo, given only the prompt, reaches a working board (manual check, noted in the PR)

## Out of scope

- The demo GIF — #0036

## Notes

- PRD stories 12, 17.

## Review

Everything but the last criterion is done (`docs/` holds the prompt and the
workflow pages; a Vitest test keeps the README's copy of the prompt in sync).
I ran `loopboard init` and the CLI in a temp repo and got a working, empty
board — but "a fresh agent session reaches a working board from the prompt
alone" needs a real, fresh agent session: paste the README prompt into one in
a throwaway repo once `npx loopboard` resolves (after #0001/#0035), and flip
to `done` when it works.
