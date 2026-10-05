---
id: 0045
title: Adopt neutral tokens, Inter and a rewritten Brand Kit
category: user-story
status: done
assignee: agent
project: 02-linear-like-ux
phase: 1
labels: [ui, design]
created: 2026-10-05
---

## User story

As a **maintainer**, I want a neutral gray UI with one violet accent and Inter, in light and dark, so that loopboard feels calm and current.

## Acceptance criteria

- [x] Semantic tokens (backgrounds, surfaces, borders, 4 text levels, accent set, focus ring, status colors, 7 tones, radii, shadows, motion) replace paper/ink/ember everywhere; no old token names remain
- [x] Inter Variable and JetBrains Mono self-hosted; Fraunces and Geist removed from deps and CSS
- [x] Base elements restyled: buttons (primary, secondary, ghost, danger), inputs, selects, segmented, kbd, focus rings
- [x] Wordmark = loop mark + "loopboard" in Inter; favicon in the accent
- [x] `scripts/contrast.mjs` checks the new pairs in both themes and passes
- [x] Brand Kit rewritten (tokens, type, components, rules); components rule and spec § 14 updated
- [x] Visual baselines regenerated and reviewed

## Out of scope

- Per-component layout restyles (later issues)

## Notes

- Global stylesheet keeps tokens, base elements and shared primitives; component styles move into SFCs as each is restyled.
