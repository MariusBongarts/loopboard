# CI and release

| Piece | Where | Does |
|---|---|---|
| CI | [ci.yml](../../.github/workflows/ci.yml) | On every PR and push to main, on macOS, Linux and Windows: `pnpm verify` (types, Vitest, contrast), Playwright (visual baselines only on macOS), `pnpm build`, `pnpm smoke` |
| Smoke | [scripts/smoke.mjs](../../scripts/smoke.mjs) | Packs the tarball, fails if it ships tests/sources/this repo's issues, runs `npx loopboard init` in a fresh repo, starts the packed server and queries it |
| README demo | [demo.yml](../../.github/workflows/demo.yml), [scripts/demo/](../../scripts/demo/) | `pnpm demo` films the real board (Vite dev server, Playwright) while a storyboard edits a demo repo's issue files, in light and dark, and encodes `docs/media/demo-{light,dark}.gif` in pure JS. Frames are captured step by step with transitions off, so the same UI gives byte-identical GIFs; on pushes to main that touch the UI, CI re-records and opens a `bot/readme-demo` PR only when they changed |
| Release | [release.yml](../../.github/workflows/release.yml) | On a `v*` tag matching `package.json`: verify, build, smoke, `npm publish --provenance`, a GitHub release from the matching CHANGELOG section |
| Package contents | `files` in [package.json](../../package.json) | `bin/`, `build/` (client + CLI), `scaffold/`, the shipped `.agents/` parts (skills, issue/project READMEs and templates), license, credits, changelog, migrations |

The CLI is a Vite SSR build of [server/cli.ts](../../server/cli.ts) into
`build/server/cli.js`, started by [bin/loopboard.js](../../bin/loopboard.js);
the client builds into `build/client/`. `prepublishOnly` rebuilds and
verifies, so a local `npm publish` can't ship a stale build.
