# 9. Help and onboarding

> One setup prompt ([docs/setup-prompt.md](../../docs/setup-prompt.md)), one
> upgrade prompt ([docs/upgrade-prompt.md](../../docs/upgrade-prompt.md)) and
> one set of workflow docs ([docs/](../../docs/)) serve the README, the Help
> Center and every empty state. The course's chapters live in
> [docs/learn/](../../docs/learn/); its videos are rendered from
> [videos/](../../videos/) with Remotion.

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Open Help from anywhere | ✅ | [`09-help-and-onboarding.spec.ts`](../../tests/e2e/09-help-and-onboarding.spec.ts): `?`, page nav, reference sections, shortcut table, back, rail link |
| Explore the loop diagram | ✅ | `09-help-and-onboarding.spec.ts`: tabs, details, arrow keys, chapter link |
| Copy the setup prompt | ✅ | `09-help-and-onboarding.spec.ts`: clipboard equals `docs/setup-prompt.md` |
| Learn how to work with agents | ✅ | `09-help-and-onboarding.spec.ts`: 8 chapters, 6 videos, plays in view / pauses out of view, chapter jump, theme switch |
| Videos stay still with reduced motion | ✅ | `09-help-and-onboarding.spec.ts` |
| Watch Matt Pocock's videos | ✅ | `09-help-and-onboarding.spec.ts`: no YouTube request before the click, embed after |
| See which repos need an upgrade | ✅ | `09-help-and-onboarding.spec.ts` against the fixture repos; every level case in `tests/migrations.test.ts` |
| Copy the upgrade prompts | ✅ | `09-help-and-onboarding.spec.ts`: request, and the prompt with the package path filled in |
| First visit with no workspaces | ✅ | `09-help-and-onboarding.spec.ts` (workspace list stubbed empty) |
| A set-up workspace with no issues yet | ✅ | `09-help-and-onboarding.spec.ts` |
| A workspace whose folder is gone | ✅ | `09-help-and-onboarding.spec.ts`: page, switcher, recovery by polling, Forget |

### Scenario: Open Help from anywhere

```
GIVEN I'm on a workspace
WHEN I press "?" (outside a text field, no dialog open), click Help at the
    bottom of the rail, or run "Open Help" from ⌘K
THEN the Help Center opens at /help with a sidebar: Overview, Working with
    AI agents, Set up a repo, Upgrade a harness, Reference
AND the page I'm on lists its sections under it in the sidebar, marking the
    one in view; clicking one scrolls to it
AND Reference shows The loop, What lives where, Statuses and fields and
    Keyboard shortcuts; the shortcut table lists exactly the shortcuts the
    app handles
WHEN I click "← Back to the board" on any Help page
THEN I'm back on the workspace I came from
```

On narrow screens the sidebar becomes a row of page links above the page.

### Scenario: Explore the loop diagram

```
GIVEN I'm on the Help overview
THEN the loop shows as a ring of six steps: Decide, Plan, Slice, Build,
    Verify, Steer — Decide selected
WHEN I click a step, or move to it with the arrow keys
THEN a panel shows what the step does, what I say to my agent, which skill
    answers, what comes back, and links to its course chapter
AND the accent arc on the ring shows how far round the loop the step is
```

### Scenario: Copy the setup prompt

```
GIVEN the setup prompt is shown (Set up a repo, the welcome page, a missing
    workspace)
WHEN I click "Copy setup prompt"
THEN the prompt is on my clipboard and the button reads "Copied" briefly
```

### Scenario: Learn how to work with agents

```
GIVEN I open Working with AI agents
THEN the page credits Matt Pocock and links mattpocock/skills
AND lists eight chapters: Agents forget, the repo remembers · Skills ·
    Grill me · The PRD · Thin vertical slices · The issue loop · Feedback
    loops · You steer from the board
AND six chapters open with a short video in the current theme (light or
    dark), showing its poster until it plays; every video chapter says what I
    say to my agent and which skill answers
WHEN a video is at least half on screen
THEN it plays muted and looped; scrolled away, it pauses
WHEN I switch the theme
THEN the videos switch to that theme's version
```

### Scenario: Videos stay still with reduced motion

```
GIVEN my system asks for reduced motion
WHEN I open Working with AI agents
THEN no video plays on its own; each shows its poster and plays only from
    its controls
AND the loop diagram on the overview doesn't animate
```

### Scenario: Watch Matt Pocock's videos

```
GIVEN I'm on "Learn from the source" at the end of the course
THEN six of Matt Pocock's videos show as cards (title, length, what it
    covers) with "Open on YouTube", plus a reading list of his articles
AND nothing has been requested from YouTube
WHEN I click a card's play button
THEN the video's youtube-nocookie.com embed replaces the card and plays
```

### Scenario: See which repos need an upgrade

```
GIVEN registered workspaces
WHEN I open Upgrade a harness
THEN it names the latest migration and this loopboard's version
AND lists every workspace with its harness level (the marker in its
    AGENTS.md) and a status: Up to date, N behind, No marker (M000), No
    AGENTS.md or Folder missing — plus "ai/ root" for a legacy harness
AND lists every migration with its id, title and date, newest first
```

### Scenario: Copy the upgrade prompts

```
GIVEN I'm on Upgrade a harness
WHEN I click "Copy request"
THEN "upgrade my loopboard harness" is on my clipboard
WHEN I click "Copy upgrade prompt"
THEN the full prompt for a repo without the skill is on my clipboard, naming
    the folder this loopboard runs from instead of <path-to-loopboard>
AND the page explains what `npx loopboard init --upgrade` (with --dry-run and
    --force) does and that merging and migrations are the skill's job
```

### Scenario: First visit with no workspaces

```
GIVEN no workspace is registered
WHEN I open loopboard
THEN a welcome page explains what loopboard shows
AND offers "add it here" for a repo that's already set up (the Add
    workspace dialog, § 7)
AND shows the setup prompt for a new repo
```

### Scenario: A set-up workspace with no issues yet

```
GIVEN a workspace whose root has no issues, sessions or projects yet
WHEN I open it
THEN the feed shows "Nothing here yet" with the first three things to ask an
    agent (grill me, write a PRD, break it into issues) and a link to Help
AND a "New issue" button (shortcut C) to file one myself
AND the pane says the board appears once there are issues
```

### Scenario: A workspace whose folder is gone

```
GIVEN a registered workspace whose root folder no longer exists
WHEN I open it
THEN a page names the missing path, keeps the workspace switcher, offers
    "Forget this workspace", and shows how to set the repo up again
AND when the folder comes back, the page turns into the board by itself
```
