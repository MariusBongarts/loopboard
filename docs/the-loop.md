# The loop

You decide; your agent builds; the board shows where everything stands. Each
step is a skill your agent already has after `loopboard init` — ask for it in
plain words.

| Step | You say | What happens |
|---|---|---|
| **Decide** | "grill me on …" | The agent interviews you, one question at a time, until the plan has no open branches. |
| **Plan** | "write a PRD for this" | A project folder: `prd.md` (the contract) and `wip.md` (the journal). |
| **Slice** | "break it into issues" | Vertical-slice issues in `.agents/issues/`, grouped by phase in the WIP. |
| **Build** | "implement #0012" / "work on the next todo" | One issue end to end: code, tests, verify, specs, a WIP entry. |
| **Close** | — | Verified work goes straight to `done`. |
| **Check** | — | Work the agent can't verify itself goes to `in-review`, assigned to you, with a `## Review` note saying what to look at. |

Two rules keep it honest:

- **Assignee, not status, says who's driving.** When the agent needs you, it
  flips `assignee: human` and writes its questions into the issue; status
  never moves backward. "Needs you" on the board lists exactly those.
- **Done means verified.** Review is optional and comes later: set
  `reviewed: <date>` on issues you've looked at, and `deployed: <date>` when
  they ship.

Specs (`.agents/specs/`) record what the product does, scenario by scenario,
with their end-to-end coverage; the Specs view shows what's tested.
