# Agents forget, the repo remembers

A coding agent starts every session with an empty head. Whatever you
explained yesterday — the plan, the trade-off you settled, the bug you found —
is gone unless it's written down where the agent will read it. Its context
window is finite too: the more you pile into one conversation, the worse it
gets at using any of it.

So the workflow keeps everything that matters in files, in the repo:

- **`AGENTS.md`** is read at the start of every session. It holds the session
  loop and points to everything else, which the agent loads only when a task
  needs it.
- **`.agents/`** holds the plan (projects with a PRD and a WIP journal), the
  work (issues) and what's true about the product (specs, architecture).
- **Git** is the history.

Each session starts small: read the current focus, pick one issue, do it,
write down what happened. The next session — yours or another agent's — picks
up from the files, not from memory.

That's the *harness*: the files and instructions around the model that make
it dependable. loopboard is a window onto it.

Matt Pocock calls the start of the context window, where the model is still
sharp, the [smart zone](https://www.aihero.dev/ai-coding-dictionary/smart-zone):
small sessions and files on disk keep the agent in it.
