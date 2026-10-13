# loopboard videos

The explainer videos in loopboard's Help Center (Help → Working with AI
agents), written as [Remotion](https://www.remotion.dev) compositions in the
app's own tokens and fonts. This folder is a maintainer tool: it has its own
install, it isn't part of the published package, and only the rendered MP4s
and posters in `../public/media/` ship
([ADR-0006](../.agents/architecture/decisions/0006-remotion-renders-mp4s-ship.md)).

```bash
pnpm videos          # render every course video, light + dark, with posters
pnpm videos:studio   # Remotion Studio: scrub and edit the compositions
pnpm videos:film     # the overview film (1920×1080 and 1080×1080) into videos/out/
```

From inside this folder: `node render.mjs <name>` renders one video and
`node render.mjs --stills <name> 60,200` writes preview frames to
`out/stills/`. Rendering reuses Playwright's headless Chrome when it's
installed; otherwise Remotion downloads its own.

| File | What |
|---|---|
| `src/catalog.ts` | Every composition, its length and poster second — the app's tests read it too |
| `src/tokens.ts` | Colors from `src/styles.css`; `tests/video-tokens.test.ts` fails when they drift |
| `src/ui.tsx`, `src/motion.ts` | The stage, captions, cards, status icons, avatars; one ease, nothing bounces |
| `src/scenes/` | One scene per course chapter |
| `src/Film.tsx` | Intro, the six scenes and credits, scaled into landscape or square |

After changing a composition or the tokens, run `pnpm videos` and look at the
new posters before committing.

## License

The compositions are part of loopboard (MIT). Remotion itself is
source-available under the [Remotion License](https://www.remotion.dev/license):
free for individuals and organizations of up to three people. If you render
these videos on behalf of a larger company, check whether you need a company
license. People who only watch the rendered videos need none.
