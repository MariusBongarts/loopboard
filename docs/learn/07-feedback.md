# Feedback loops keep agents honest

An agent is only as good as what tells it that it's wrong. Give it fast,
automatic feedback and it iterates toward working code; without it, it
reports success anyway.

- **One verify command** — type-check, lint, tests — lives in `AGENTS.md`, and
  done means it passed.
- **Test-first** with `tdd`: one failing test for one behavior, make it pass,
  refactor, repeat. Tests that go through public interfaces survive
  refactors.
- **Specs** describe what the product does as Given / When / Then scenarios,
  each mapped to an end-to-end test. The Specs view shows the coverage.
- **When something breaks**, `diagnose` reproduces it first, then minimises,
  hypothesises and instruments before it fixes anything.

The tighter the loop, the more you can leave to the agent.

Go deeper: [tdd](https://www.aihero.dev/skills-tdd) and
[diagnosing bugs](https://www.aihero.dev/skills-diagnosing-bugs) by Matt Pocock.
