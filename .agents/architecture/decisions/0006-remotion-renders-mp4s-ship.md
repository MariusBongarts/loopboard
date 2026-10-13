# Remotion renders the Help Center's videos; only the MP4s ship

- **Status**: accepted — built in #0064, #0065
- **Date**: 2026-10-05

The course needs motion graphics that look like loopboard and can change with
the UI. They're React compositions rendered with Remotion by the maintainer,
in light and dark, into plain H.264 MP4s and poster stills that ship as static
assets. Remotion lives in its own package in `videos/`, outside the published
files and the app's install. Remotion is source-available, not open source:
its free license covers individuals and companies of up to three people, and
embedding its Player counts as use — so bundling the Player would put React in
every user's loopboard and a company license on any larger team that runs it.
Receiving rendered media needs no license.

## Considered options

- **`@remotion/player` in the app** — interactive and theme-aware, but the
  license and bundle reasons above.
- **CSS/SVG animation only** — no license question, but much harder to
  author and preview longer sequences; the overview's loop diagram does use
  native SVG, where interactivity matters more than sequencing.
- **Screen recordings** — go stale with every UI change and can't follow the
  theme.

## Consequences

- Re-render after changing a composition or the tokens (`pnpm videos`); a
  test fails if the video tokens drift from `styles.css`.
- Anyone rendering needs a Remotion license if their organization has more
  than three people working on the compositions.
