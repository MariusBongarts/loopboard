---
title: Short name of the routine
schedule: "30 7 * * 1-5"   # five-field cron in quotes, or `at: YYYY-MM-DD HH:MM` for once
timezone: Europe/Berlin    # IANA zone; the machine's when left out
expires-after: 6h          # optional: a later start is recorded as expired
created: YYYY-MM-DD
# timeout: 2h              # optional: a run older than this counts as aborted
# host: studio             # optional: only this machine runs it
# writes-to: [other-id]    # optional: other harnesses a run may write to
---

What a run does, step by step, for an agent that knows nothing but this
harness: what to read, what to produce, where to put it, and when to stop
and fail instead.

1. …
2. …
