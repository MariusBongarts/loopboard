# `.agents/` is the default root; `ai/` is detected for legacy repos

- **Status**: accepted — default switched in #0002; detection in #0007
- **Date**: 2026-10-04

New setups keep issues, projects, specs, architecture, rules and design
under `.agents/`, next to `.agents/skills/` — one home for everything agents
use. Users always point loopboard at the **repo root**, never at the hidden
folder, so macOS Finder hiding dot-folders doesn't matter; loopboard looks for
`.agents/issues`, then `ai/issues`. Agents find the folder because AGENTS.md
names the path, not because a search finds it — `rg` and `fd` skip hidden
folders by default.

## Considered options

- **Visible `ai/`** — shows up everywhere, but splits agent material across
  `ai/` and `.agents/skills/`.
- **A per-repo config file** naming the root — explicit, but one more file
  every adopter keeps.
