---
id: 0067
title: Link Matt Pocock's videos with click-to-load embeds
category: user-story
status: done
assignee: agent
project: 03-help-center
phase: 2
parent: 0066
labels: [ui, help, content]
created: 2026-10-05
---

## User story

As a **reader**, I want to watch Matt Pocock's videos on skills and AI coding
from the course, without anything loading from YouTube until I click, so that
I can go deeper and loopboard still doesn't call out on its own.

## Acceptance criteria

- [x] A "Learn from the source" section lists verified videos (oEmbed-checked IDs) as local cards: title, what it covers
- [x] Clicking a card swaps in a `youtube-nocookie.com` embed; "Open on YouTube" opens it in a new tab
- [x] e2e: no request to YouTube before a click; the iframe appears after it

## Notes

- PRD stories 21–22.
- Six videos, each oEmbed-verified on 2026-10-05 (author "Matt Pocock"). A walkthrough on the AI Engineer channel was left out: its oEmbed author isn't Matt.
