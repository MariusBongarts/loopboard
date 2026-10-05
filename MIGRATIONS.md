# Migrations

Workflow changes for repos that already run the loopboard harness (AGENTS.md
+ skills + an `.agents/` or `ai/` root). New repos get the latest conventions
from `loopboard init` and need none of this.

Each harness records the last migration it applied as a comment in its
AGENTS.md:

```markdown
<!-- loopboard:migration M002 -->
```

No marker means **M000**: the harness predates migrations. Apply pending
migrations with the [`upgrade-harness`](.agents/skills/upgrade-harness/SKILL.md)
skill — it merges upstream skills and READMEs into your customized copies,
runs the steps below in order, and asks before anything marked
**Confirm first**.

Each entry lists what changed, why, how to apply it to an existing harness,
and which steps need the maintainer's go-ahead. Never renumber or edit a
shipped migration; fix mistakes with a new one.

---

## M001 — Conventions under `.agents/`, credits, `source:` field

*2026-10-04 · #0002, #0004*

**Changed**

- New harnesses keep `issues/`, `projects/`, `specs/`, `architecture/`,
  `rules/` and `design/` under `.agents/`, next to `.agents/skills/`.
  loopboard still detects an `ai/` root.
- Skills reference `.agents/…` paths and no longer name a specific product.
- Adapted skills end with an attribution line; caveman is no longer shipped.
- Issues accept an optional `source: github#N` field.

**Why** — one home for everything agents use; honest credit for adapted
skills; a trail from public reports to issue files.

**Apply**

1. **Root (Confirm first).** If the root is `ai/`, ask whether to move it.
   On yes: `git mv` each existing `ai/<folder>` into `.agents/<folder>`, then
   replace `ai/` path references in AGENTS.md, CLAUDE.md, skills, READMEs,
   templates, specs, architecture docs and any scripts or configs — grep and
   show the hits first. On no: keep `ai/`, and keep skill paths pointing at it.
2. Merge the issues README's "Source (optional)" section and the `source:`
   line of the three issue templates.
3. Merge upstream skill changes, including the attribution lines.
4. **caveman (Confirm first).** If `.agents/skills/caveman` exists, ask
   whether to keep it. It still works; it's just no longer shipped
   (upstream: JuliusBrussee/caveman, Apache-2.0).

---

## M002 — Agents close verified issues; review becomes a marker

*2026-10-04 · #0039*

**Changed**

- When `verify` passes and every acceptance criterion is met, the agent flips
  the issue to `done`.
- `in-review` now means "waiting on a human check the agent can't do" —
  always `assignee: human`, with a `## Review` section saying what to check.
- Optional `reviewed: YYYY-MM-DD` and `deployed: YYYY-MM-DD` frontmatter
  record review and deploys after `done`. Agents never set `reviewed:`.

**Why** — review that never happens turned `in-review` into a graveyard (in
one harness, 41% of live issues). Done should mean done; review is a queue
the maintainer works through when they choose.

**Apply**

1. AGENTS.md session loop: replace "flip to `in-review`" / "maintainer
   verifies → `done`" with the upstream wording, keeping the harness's own
   verify command.
2. Issues README: the `in-review` and `done` rows, the "default path"
   paragraph and the "Review and deploy markers (optional)" section.
3. Projects README (session step) and the implement and triage skills.
4. If the harness has a glossary: add "In review" and "Reviewed / Deployed".
5. **Stale reviews (Confirm first).** Count live issues with
   `status: in-review`, split by assignee, and show the age range. Offer:
   move the agent-assigned ones to `done` (all / created before a date the
   maintainer picks / none). Human-assigned ones stay; list those without a
   `## Review` section. Change only the `status:` line, and never set
   `reviewed:`.
