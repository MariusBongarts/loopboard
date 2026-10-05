# Ship as an npx CLI that starts a local server

- **Status**: accepted — built in #0007
- **Date**: 2026-10-04

loopboard reads and writes markdown files in the user's repos, so it needs
file-system access and a write path. We ship it as `npx loopboard`: a Node
server bound to 127.0.0.1 that serves the built client and the API, and opens
the browser. Developers who run coding agents already have Node; it works on
macOS, Linux and Windows with no code signing, and it reuses the existing
Node file code unchanged.

## Considered options

- **Mac desktop app (Tauri/Electron)** — native feel and a folder picker,
  but signing, notarization and auto-update, one OS per build, and either a
  port of the fs code (Tauri) or a ~150 MB runtime (Electron). Kept as a
  backlog wrapper around the same server (#0037).
- **Hosted website + File System Access API** — no install, but Chromium
  only, permission re-prompts every session, and every write moves into the
  browser. A read-only hosted demo stays possible (#0038).

## Consequences

The local server is an attack surface: it must reject foreign `Host` headers
(DNS rebinding) and foreign `Origin`s on writes. The API handler must be
independent of Vite so the dev plugin and the CLI share it.
