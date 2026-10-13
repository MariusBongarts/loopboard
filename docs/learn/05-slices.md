# Issues: thin vertical slices

"Break it into issues" turns the PRD into issue files, and the rule that
matters is how they're cut.

A **horizontal slice** does one layer: the schema, then the API, then the UI.
Nothing works until the last one lands, and problems hide until then.

A **vertical slice** — a tracer bullet — goes through every layer for one
small piece of behavior. It works end to end, can be checked on its own, and
shows what's wrong while it's still cheap to change.

Each issue is one slice: small enough for one session, with acceptance
criteria an agent can check. `parent:` marks the issue that must land first.

Go deeper: [Tracer Bullets: Keeping AI Slop Under Control](https://www.aihero.dev/tracer-bullets)
by Matt Pocock.
