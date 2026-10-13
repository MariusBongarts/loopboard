#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cli = join(root, "build", "server", "cli.js");

// A clone that was never built has no build/ (#0076).
if (!existsSync(cli)) {
  console.error(`loopboard isn't built yet: run \`pnpm build\` in ${root}, then try again.`);
  process.exitCode = 1;
} else {
  const { main } = await import(pathToFileURL(cli).href);
  main(process.argv.slice(2)).then(
    (code) => {
      if (typeof code === "number") process.exitCode = code;
    },
    (err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    },
  );
}
