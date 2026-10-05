---
id: 0038
title: Host a read-only public demo of loopboard
category: user-story
status: backlog
assignee: agent
project: 01-open-source-launch
labels: [distribution, docs]
created: 2026-10-04
---

## User story

As a **visitor**, I want **to click through a live, read-only loopboard showing this repo's own `.agents/`**, so that **I can judge it before installing anything**.

## Acceptance criteria

- [ ] A static export (`loopboard export`) bakes one workspace's data into the built client
- [ ] Read-only UI state: no drag, edit or create; a banner links to setup
- [ ] Deployed to GitHub Pages from CI on each release

## Out of scope

- Any hosted backend

## Notes

- Deferred in the PRD: not required for launch.
