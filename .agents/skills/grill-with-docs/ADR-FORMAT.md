# ADR format

ADRs live at
[`ai/architecture/decisions/NNNN-slug.md`](../../../ai/architecture/decisions/)
with sequential 4-digit numbering: `0001-event-sourced-orders.md`,
`0002-postgres-for-write-model.md`, etc.

The directory is created lazily — only when the first ADR is needed. After
that, scan the existing files and increment the highest number by one.

## Template

```markdown
# {Short title of the decision}

{1–3 sentences: what's the context, what did we decide, and why.}
```

That's it. An ADR can be a single paragraph. The value is in recording *that*
a decision was made and *why* — not in filling out sections.

## Optional sections

Only include these when they add genuine value. Most ADRs won't need them.

- **Status** frontmatter (`proposed | accepted | deprecated | superseded by ADR-NNNN`)
  — useful when decisions are revisited.
- **Considered options** — only when the rejected alternatives are worth
  remembering.
- **Consequences** — only when non-obvious downstream effects need to be
  called out.

## Numbering

Scan `ai/architecture/decisions/` for the highest existing number and
increment by one. Pad to 4 digits.

## When to offer an ADR

All three of these must be true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful.
2. **Surprising without context** — a future reader will look at the code
   and wonder *"why on earth did they do it this way?"*
3. **The result of a real trade-off** — there were genuine alternatives and
   you picked one for specific reasons.

If a decision is easy to reverse, skip it — you'll just reverse it. If it's
not surprising, nobody will wonder why. If there was no real alternative,
there's nothing to record beyond *"we did the obvious thing."*

### What qualifies

- **Architectural shape.** "We're using Nuxt 3 with Firebase App Hosting."
  "Email rendering is a server-side template generated per execution."
- **Integration patterns.** "Modules emit `output` blobs that the email
  factory composes; modules don't render their own HTML."
- **Technology choices that carry lock-in.** Database (Firestore vs SQL),
  payment provider (Paddle vs Stripe), email transport (SES vs SendGrid),
  auth provider. Not every library — just the ones that would take a quarter
  to swap out.
- **Boundary decisions.** "Credit deduction happens *after* a successful send,
  not before." "Templates have no per-day cadence — only a single
  `deliveryTime` field."
- **Deliberate deviations from the obvious path.** "We use `priorIssues`
  passed at draft-time but stripped before persistence" — anything where a
  reasonable reader would assume the opposite.
- **Constraints not visible in the code.** "Paddle is the merchant of record
  for VAT." "All deliveries clamp recipient count at 100 as an abuse rail."
- **Rejected alternatives when the rejection is non-obvious.** If you
  considered Stripe and picked Paddle for subtle reasons, record it —
  otherwise someone will suggest Stripe again in six months.
