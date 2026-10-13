# A Help Center that teaches the loop — PRD

> Drafted: 2026-10-05
> Status: in-progress

## Problem statement

loopboard's Help page is one scrolling page of reference tables: a setup
prompt, the loop, the folder map, statuses and shortcuts. It tells people
*what* the files are, not *why* working this way makes a coding agent
reliable. Someone new to agents doesn't learn what a skill is, why you grill
before you plan, or why issues are thin vertical slices — the ideas behind the
workflow live in Matt Pocock's skills repo and videos, which the app never
mentions beyond a credits file. And a maintainer whose repos run an older
harness has to dig the upgrade prompt out of the README, with no way to see
which repos are behind.

## Solution

Help becomes a Help Center with its own navigation: an overview, a course
("Working with AI agents"), setup, upgrade, and reference. The overview shows
the loop as an interactive diagram. The course explains, chapter by chapter,
why agents need a harness, what skills are, grilling, PRDs, vertical-slice
issues, the issue loop, feedback loops and steering from the board — each
chapter with a short motion-graphics video in the app's own look (light and
dark), made with Remotion. It credits Matt Pocock as the source of the skills
and much of the thinking, and links his repo, writing and videos (videos load
from YouTube only when you click them). The upgrade guide puts the upgrade
prompts in the app, filled in with the path of the loopboard you're running,
and shows each registered repo's harness level against the latest migration.
The same video compositions render a longer overview film the maintainer can
post.

## User stories

### Help Center

1. As a **maintainer**, I want Help to have its own navigation (Overview, Working with AI agents, Set up a repo, Upgrade a harness, Reference), so that I can go straight to what I need instead of scrolling one long page.
2. As a **maintainer**, I want "← Back to the board" to return to the workspace I came from on every Help page, so that browsing Help never loses my place.
3. As a **maintainer**, I want `?`, the rail's Help link and the ⌘K command to keep opening Help, so that nothing I learned stops working.
4. As a **maintainer**, I want the Help Center to work in light and dark and at narrow widths, so that it looks like the rest of loopboard.
5. As a **newcomer**, I want an overview page that shows the loop as a diagram and links to each part of Help, so that I understand the whole workflow in one glance.
6. As a **newcomer**, I want to click a step of the loop diagram and see what I say to my agent and which skill runs, so that the loop becomes something I can do, not just read.

### Set up and reference

7. As a **newcomer**, I want the setup prompt and what `loopboard init` creates on one page, so that I can set up a repo without reading the README.
8. As a **maintainer**, I want the loop table, folder map, statuses and keyboard shortcuts on a reference page, so that I can look things up quickly.

### Upgrade guide

9. As a **maintainer**, I want the upgrade prompts in the Help Center — the plain "upgrade my loopboard harness" request and the full prompt for repos without the skill — each with a copy button, so that I don't have to find them in the README.
10. As a **maintainer**, I want the full upgrade prompt to name the path of the loopboard I'm running, so that I can paste it without editing a placeholder.
11. As a **maintainer**, I want the `init --upgrade` flags explained next to the prompts, so that I know what the CLI does and what the skill does.
12. As a **maintainer**, I want to see every registered repo's harness level next to the latest migration (up to date, N behind, no marker, legacy `ai/` root, folder missing), so that I know which repos to upgrade.
13. As a **maintainer**, I want the list of migrations with their titles, so that I know what an upgrade will change.

### Working with AI agents (the course)

14. As a **newcomer**, I want a course page that explains, in order, why agents need a harness, skills, grilling, PRDs, vertical-slice issues, the issue loop, feedback loops and steering from the board, so that I learn how to work with agents, not just how to use loopboard.
15. As a **newcomer**, I want each chapter to have a short motion-graphics video, so that the idea is easy to grasp before I read the details.
16. As a **maintainer**, I want the videos to follow the app's theme (light or dark), so that they look native.
17. As a **maintainer with reduced motion enabled**, I want videos not to autoplay, so that the page respects my setting.
18. As a **newcomer**, I want videos to play only while they're on screen, muted and looping, with controls, so that the page stays calm.
19. As a **newcomer**, I want every chapter to say what I'd type to my agent and which skill answers, so that I can try it right away.
20. As a **reader**, I want the course to credit Matt Pocock clearly and link his skills repo and writing, so that I know where the ideas come from and can learn more.
21. As a **reader**, I want to watch Matt Pocock's videos on the topic from the course, so that I can go deeper.
22. As a **privacy-minded maintainer**, I want nothing to load from YouTube until I click a video, so that loopboard still doesn't call out on its own.

### Videos as a maintainer tool

23. As a **maintainer**, I want the explainer videos built from code with Remotion in the app's own tokens and fonts, so that I can change them and re-render instead of re-recording.
24. As a **maintainer**, I want one command that renders every video in both themes plus poster images, so that refreshing them is cheap.
25. As a **maintainer**, I want a longer overview film (the chapters in sequence) in landscape and square, so that I can post about how I work with AI.
26. As a **contributor**, I want Remotion kept out of the app's install and bundle, so that `pnpm install` stays light and users never run Remotion code.

## Implementation decisions

- **Nested Help routes.** `/help` becomes a layout with child pages:
  overview (`/help`), course (`/help/learn`), setup (`/help/setup`), upgrade
  (`/help/upgrade`) and reference (`/help/reference`). Every Help link carries
  the `from` query so the back link keeps working. `?` keeps opening `/help`.
  Over a single long page: the course alone is longer than today's whole Help
  page, and pages give each topic a linkable URL.
- **Docs stay the single source.** The setup prompt, the upgrade prompt, the
  loop, folder map and statuses stay markdown in `docs/`, rendered by the app
  and quoted verbatim by the README; a unit test fails when the README drifts
  from the prompt files. Course copy lives in a typed content module so the
  page, the diagram and the tests read one list of steps and chapters.
- **One copyable prompt component.** The setup prompt component becomes a
  generic copyable prompt (text + button label), used for setup, both upgrade
  prompts and the empty states.
- **Harness status endpoint.** A read-only `GET /api/harness` returns the
  running package's version and path, the latest migration, the migration
  list (id, title, date) and, per registered workspace, its level from the
  AGENTS.md marker (none → M000), whether the root is legacy `ai/`, and
  whether the folder is missing. Migration parsing moves into one server
  module that `init` also uses. The upgrade prompt's `<path-to-loopboard>`
  placeholder is filled with the package path on the client.
- **Remotion as a maintainer-only render tool.** Videos are React
  compositions in a standalone `videos/` package (own install, outside the
  pnpm workspace and the published files). They render to H.264 MP4 at
  1280×720 in both themes, plus a poster still each, into the app's public
  media folder; only those files ship. Over embedding `@remotion/player`:
  that would bundle React and Remotion into every user's loopboard and put
  Remotion's company license on any team larger than three that runs it; a
  rendered MP4 is a plain asset. Recorded as an ADR.
- **Videos use the app's tokens.** Compositions take a `theme` input and use
  the same OKLCH values, Inter and JetBrains Mono, and the Brand Kit's motion
  rules (eased, nothing bounces). The token values are copied into the video
  package once and checked against `styles.css` by a test, so drift is caught.
- **Video player behavior.** A small player picks the file for the current
  theme, shows the poster, autoplays muted and looped only while at least half
  visible, pauses when scrolled away, and never autoplays under
  `prefers-reduced-motion`. Each video has a text alternative in the chapter.
- **Static server serves media properly.** The CLI's static server learns
  `video/mp4`, JPEG and WebP types and answers `Range` requests with 206 —
  Safari won't play video without them.
- **External videos are click-to-load.** Matt Pocock's videos show as local
  cards (title, length, what it covers); clicking swaps in a
  `youtube-nocookie.com` embed, with an "Open on YouTube" link alongside. No
  thumbnails or scripts load before the click. Video IDs are verified against
  YouTube's oEmbed before they're listed.
- **Interactive loop diagram is native SVG.** The overview's diagram is a
  Vue component in theme tokens (crisp, keyboard-focusable steps), not a
  video, so it can respond to clicks and follow the theme instantly.

## Testing decisions

- Playwright (spec § 9) covers what a user sees: Help navigation and the back
  link across pages, `?` and the rail link, the loop diagram's step details,
  course chapters with a video and poster per chapter, reduced motion not
  autoplaying, YouTube not loading until a click, copying the setup and
  upgrade prompts (clipboard equals the doc with the path filled in), and the
  harness table against the fixture repos.
- Vitest covers pure logic: migration parsing and harness levels on real temp
  repos (marker, no marker, `ai/` root, missing folder), the `/api/harness`
  route through the handler, Range parsing in the static server, README ↔
  prompt docs staying identical, the course content (every chapter has a
  video that exists in both themes plus a poster), and video tokens matching
  `styles.css`.
- Visual regression: the Help baseline is refreshed for the new overview in
  both themes (macOS), and the new images are looked at before they're kept.
- Prior art: `09-help-and-onboarding.spec.ts`, `tests/handler.test.ts`,
  `tests/init.test.ts`, `tests/demo-gif.test.ts`.

## Out of scope

- **Embedding `@remotion/player` or React in the app.** Licensing and bundle
  size (see decisions); rendered MP4s give the same learning value.
- **Narration and subtitles tracks.** The videos carry on-screen text and
  each chapter repeats it in prose; voice-over needs a script review and a
  recording setup the project doesn't have.
- **Hosting the videos or the course publicly.** loopboard stays local; a
  public site belongs to the read-only demo idea (#0038).
- **Downloading Matt Pocock's thumbnails or videos into the repo.** They're
  his content; linking and click-to-load embeds credit him without
  redistributing.
- **Search inside Help.** Five pages don't need it yet; ⌘K already reaches
  Help.
- **Translating Help.** English only, like the rest of the app.

## Further notes

- Domain terms used here already exist in the glossary (skill, PRD, WIP,
  issue, migration level). "Harness level" = the migration id recorded in a
  repo's AGENTS.md marker; added to the glossary with the spec update.
- Credit: the skills grill-me, grill-with-docs, to-prd, to-issues, tdd,
  diagnose, improve-codebase-architecture and write-a-skill are adapted from
  [mattpocock/skills](https://github.com/mattpocock/skills) (MIT) — see
  `.agents/skills/CREDITS.md`.
