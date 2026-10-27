---
name: routine
description: Create, change, pause or show a routine — recurring or one-time work this harness carries in .agents/scheduled/ and a dispatcher runs. Use when the user wants something done on a schedule or at a time ("every weekday at 7:30", "remind me on Friday", "check X every hour", "file the monthly report issue"), asks to pause, change or see a routine, or when you would otherwise create a scheduled task, cron job or reminder in an agent platform — never do that; write a routine instead.
---

# Routine

A routine is a folder `.agents/scheduled/<slug>/` with `routine.md` (when and
what) and `runs.md` (every run, written by loopboard). The format, the
fields and the rules every run follows are in
[`.agents/scheduled/README.md`](../../scheduled/README.md) — read it first.
One dispatcher per place runs what is due; you never schedule anything
yourself.

## Create

Ask one question at a time, each with your recommendation, and skip what
the request already answers.

1. **What does a run do?** Write the steps for an agent that knows nothing
   but this harness and runs unattended: what to read, what to produce and
   where, and when to stop and fail. If a run only has to file the same
   issue every period (a monthly report, a yearly renewal), it needs no
   agent: use `creates: issue` with `period`, `issue-title` (`{period}`,
   `{previous}`, `{date}`), the `issue-` fields and `issue-due-after`.
2. **When?** Turn the words into a five-field cron expression with the
   README's table ("weekdays 07:30" → `"30 7 * * 1-5"`, "last day of the
   month" → `L`), or `at: YYYY-MM-DD HH:MM` for once. Use the user's time
   zone in `timezone:` unless they name another.
3. **How late may it still start?** For anything tied to a time of day (a
   morning brief), recommend `expires-after` — `4h` or `6h`. Without it a
   slot missed overnight still runs when the dispatcher wakes.
4. **Does it write outside this harness?** List those harnesses by id in
   `writes-to:`. Recommend none. Runs never send mail or messages unless the
   steps say so explicitly — ask before writing such a step.
5. Only when asked or needed: `host:` (one machine), `timeout:` (default
   `2h`).

Then:

1. Pick a short kebab-case slug, copy `.agents/scheduled/_templates/routine.md`
   to `.agents/scheduled/<slug>/routine.md`, fill it in, set `created:` to
   today and drop the template's comments and unused fields.
2. Run `loopboard check` and fix every ✗; fix the warnings too.
3. Run `loopboard routines` and read the schedule in words and the next slot
   back to the user, so they can catch a wrong time.
4. If no dispatcher runs this place yet, say so and show
   `loopboard routines dispatcher-prompt` — setting it up is the user's one
   step (docs/routines.md has Claude Code, Codex and cron).

## Change, pause, resume

Edit `routine.md`: the steps, a field, `enabled: false` to pause and `true`
to resume. Never edit `runs.md`. Run `loopboard check` afterwards and read
the schedule back.

## Show

- `loopboard routines` — every routine with its schedule, next slot and last
  run; `--json` for everything.
- `runs.md` — what each run did, with its note.
- `loopboard routines prompt <slug>` — the brief the next run gets.

## Remove

Ask first: removing the folder removes its history. Recommend pausing.

## Never

- Create a scheduled task, cron entry, launchd job or reminder in an agent
  platform for a routine — the dispatcher is the only one.
- Write `runs.md`, run `start` or `finish` yourself outside a run, or commit.
