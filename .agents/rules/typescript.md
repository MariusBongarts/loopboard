# TypeScript rules

- `strict` is on; keep it. Nothing may be inferred as `any`, and don't use
  `as` to silence the compiler — narrow with type guards instead. Casting
  parsed JSON or frontmatter at a boundary is fine once you've validated it.
- Model vocabularies as `as const` arrays and derive the union type from them
  (`type Status = (typeof ALL_STATUSES)[number]`); validate input against the
  array, never a hand-written string list.
- Prefer named exports. Vue SFCs are the only default exports.
- Import Node built-ins with the `node:` prefix. Server code must not import
  from `src/`, and client code must not import from `server/` (it pulls in
  Node APIs).
- The status/assignee vocabularies and `Issue`/`Project`/`Spec` shapes exist
  twice today — [`server/issues.ts`](../../server/issues.ts) and
  [`src/types.ts`](../../src/types.ts). Change both together until a shared
  module replaces them.
- Keep pure logic (parsing, filtering, sorting) in plain `.ts` modules with
  Vitest coverage; components and request handlers stay thin.
- Match the surrounding file's style (the server uses double quotes, the
  client single quotes). Fix every TypeScript error `pnpm verify` reports, and
  delete code you made unused.
