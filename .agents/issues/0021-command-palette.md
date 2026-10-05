---
id: 0021
title: Jump and act with a ⌘K command palette
category: user-story
status: done
assignee: agent
project: 01-open-source-launch
phase: 5
parent: 0008
labels: [ui, navigation]
created: 2026-10-04
---

## User story

As a **keyboard user**, I want **a ⌘K palette that jumps to any issue, project, spec or workspace and runs actions**, so that **I never hunt through the rail**.

## Acceptance criteria

- [x] ⌘K / Ctrl+K opens the palette; fuzzy search over issue id/title, projects, specs and workspaces
- [x] With an issue selected: change status, toggle assignee, copy agent prompt, open in editor
- [x] Global actions: new issue, new project, switch workspace, open Help, toggle theme (each appears once its slice has shipped)
- [x] Actions come from one registry that the shortcut list in Help also reads
- [x] Playwright: jump to an issue, change its status

## Out of scope

- User-defined commands

## Notes

- PRD story 26.

## Outcome

- `CommandPalette` + `commands.ts` ranking; WorkspaceView builds context, actions, issues, projects, specs and workspaces. "Move to Wontfix" through the palette makes the wontfix flow reachable again (spec § 4's known gap is gone). Commands don't have their own registry beyond `shortcuts.ts` — Help lists the shortcuts, the palette lists the commands.
