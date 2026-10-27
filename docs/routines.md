# Routines

A routine is recurring or one-time work a harness carries itself: a weekly
report, an hourly mail check, a reminder on Friday, the duty to file the
month's bookkeeping issue. It lives in the harness as files, not as a task
of one agent platform, and one **dispatcher** per place runs whatever is
due ([ADR-0010](../.agents/architecture/decisions/0010-routines-run-by-a-dispatcher-outside-loopboard.md)).
loopboard reads, checks and shows routines, decides what is due and records
runs. It never starts an agent and has no timer.

## Set up a dispatcher

One dispatcher per place: one for each code repo, one for a folder of
document harnesses. It is the only scheduled task your agent platform keeps.
Print its prompt with the scope filled in:

```bash
loopboard routines dispatcher-prompt ~/repos/shop
```

```bash
loopboard routines dispatcher-prompt --under ~/leben
```

The prompt ([docs/dispatcher-prompt.md](dispatcher-prompt.md)) asks
`loopboard routines due --json` what is due, starts each routine in its own
sub-agent with fresh context and the harness as working directory, makes
sure every run ends with `finish`, and sends a push notification per run
where the platform can. It never sends anything else, and no run commits.

**Claude Code.** Create one scheduled task in the Claude Code desktop app
that runs every hour, in the place's folder, with the dispatcher prompt as
its prompt. Allow the tools its routines need — they run unattended.

**Codex.** Run the prompt non-interactively with `codex exec`, with the
place as working directory and the permissions its routines need (see
`codex exec --help`), on a schedule like the cron line below.

**cron with `claude -p`.** Any machine with cron (or launchd) and Claude
Code. cron's `PATH` is short — give it the folder that holds `node`,
`loopboard` and `claude`:

```cron
PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
0 * * * * cd "$HOME/repos/shop" && loopboard routines dispatcher-prompt . | claude -p --permission-mode acceptEdits >> "$HOME/.loopboard-dispatcher.log" 2>&1
```

Check the setup by hand first: `loopboard routines due --dry-run` says what
the dispatcher would run, and writes nothing.
