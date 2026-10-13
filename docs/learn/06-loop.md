# The issue loop

This is where the agent works on its own. "Implement #0012" — or "work on the
next todo" — runs the `implement` skill:

1. Read the project's current focus, pick a `todo` issue and flip it to
   `in-progress`.
2. Build the slice end to end: code, tests, docs.
3. Run the verify command.
4. If it passes and every acceptance criterion is met, flip it to `done`. If
   it needs a check the agent can't do — a visual review, an OAuth flow, a
   product call — flip it to `in-review`, assign it to you, and write a
   `## Review` section that says what to look at.
5. Append a session entry to `wip.md`, and update the specs if behavior
   changed.

Then the next issue. Each pass is small, verified and written down, so you can
stop at any point and nothing is half-remembered.
