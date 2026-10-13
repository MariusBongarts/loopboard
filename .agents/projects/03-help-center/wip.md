# A Help Center that teaches the loop — WIP

> Last updated: 2026-10-05
> PRD: [./prd.md](./prd.md)
> Status: in-progress

## Current focus

Everything is built and verified; three issues wait on you: watch the six
course videos (#0065), check Safari and read the course copy (#0066), and
watch the overview film before posting it (#0068). Then ship: archive the
issues and set the status to `shipped`.

## Phases

### Phase 1 — Help Center and upgrade guide

Goal: Help gets its own navigation; the upgrade prompts and each repo's harness level live in the app.

- [x] [#0060 Turn Help into a Help Center with its own navigation](../../issues/0060-help-center-shell.md) — done
- [x] [#0061 Put the upgrade guide and its prompts in the Help Center](../../issues/0061-upgrade-guide-in-help.md) — done
- [x] [#0062 Show which repos' harnesses are behind the latest migration](../../issues/0062-harness-status-per-repo.md) — done

### Phase 2 — Learn the loop

Goal: an interactive loop diagram, Remotion explainer videos and a course page that credits Matt Pocock.

- [x] [#0063 Show the loop as an interactive diagram on the Help overview](../../issues/0063-interactive-loop-diagram.md) — done
- [x] [#0064 Render explainer videos from code with Remotion](../../issues/0064-remotion-video-pipeline.md) — done
- [ ] [#0065 Make the six explainer videos for the course](../../issues/0065-explainer-videos.md) — in-review
- [ ] [#0066 Teach working with AI agents in a course page](../../issues/0066-working-with-ai-course.md) — in-review
- [x] [#0067 Link Matt Pocock's videos with click-to-load embeds](../../issues/0067-matt-pocock-videos.md) — done

### Phase 3 — Share it

Goal: a film of the workflow the maintainer can post.

- [ ] [#0068 Render a shareable overview film of how I work with AI](../../issues/0068-shareable-overview-film.md) — in-review

## Activity log

### 2026-10-05 — Help Center, upgrade guide, course and videos (#0060–#0068)

- #0060: `/help` is now a layout with child pages (overview, learn, setup,
  upgrade, reference), a sidebar that lists the active page's sections with a
  scroll-spy, and `?from=` kept on every link. `#app` is the page's scroller,
  so the layout handles hash jumps itself. SetupPrompt became CopyPrompt.
- #0061/#0062: `docs/upgrade-prompt.md` is the single source (README quoted
  verbatim, unit-tested). `GET /api/harness` reports the package path,
  migrations and each workspace's harness level; the page fills the path into
  the prompt. Migration parsing moved out of `init.ts` into `migrations.ts`.
- #0063: the overview's loop is a tablist around an SVG ring with an accent
  arc, not a perpetually orbiting marker (WCAG 2.2.2).
- #0064/#0065: `videos/` is its own pnpm workspace (Remotion 4.0.532 — .533
  was too new for pnpm's minimum-release-age policy). Six scenes in the app's
  tokens render in both themes in ~4 min, 4.5 MB in total; text was enlarged
  after seeing the videos shown at ~0.6× in the page. The SSR build copied
  `public/` too and shipped every video twice; fixed (package 9.3 → 5.0 MB).
  ADR-0006 records why the Player isn't bundled.
- #0066/#0067: chapters live in `docs/learn/` (readable on GitHub). Matt
  Pocock is credited at the top, in the skills chapter, on the overview and
  in the sidebar; six oEmbed-verified videos are click-to-load
  (youtube-nocookie) and an e2e test proves nothing loads before the click.
- #0068: the overview film renders to `videos/out/` in 1920×1080 and
  1080×1080.
- Verify passes (192 Vitest tests, contrast); e2e passes except the board's
  visual baselines, which changed with the uncommitted Segmented/ProjectPane
  work in the tree, not this project.

### 2026-10-05 — kickoff

- The maintainer asked for the upgrade prompts in Help, a much richer Help
  Center with visuals and motion graphics that teaches working with AI
  (Remotion), credit to Matt Pocock with his resources and videos, and a
  diary entry for later posts. PRD drafted; nine issues in three phases.
- Remotion stays a maintainer render tool (MP4s ship, the player doesn't):
  bundling `@remotion/player` would put React in the app and Remotion's
  company license on teams of more than three that run loopboard.

## Deferred / out of scope (added during execution)

- Narration and captions tracks — still out of scope; on-screen text plus
  the chapter prose cover it for now.
- Package size: the videos add 4.5 MB to the npm package. If that's too much
  for `npx`, host them (e.g. GitHub release assets) and load on demand —
  which would break "nothing leaves the machine", so it needs a decision.

## Ship summary

(Filled in only when status flips to `shipped`.)
