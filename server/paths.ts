import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

// The package root holds package.json, the built client and the scaffold.
// Walk up because source (server/) and build output (build/server/) sit at
// different depths.
export function packageRoot(from = MODULE_DIR): string {
  let dir = from;
  for (;;) {
    const pkg = join(dir, "package.json");
    if (existsSync(pkg)) {
      try {
        if (JSON.parse(readFileSync(pkg, "utf8")).name === "loopboard") return dir;
      } catch {
        /* keep walking */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return resolve(MODULE_DIR, "..");
    dir = parent;
  }
}

export function packageVersion(): string {
  try {
    return JSON.parse(readFileSync(join(packageRoot(), "package.json"), "utf8")).version;
  } catch {
    return "0.0.0";
  }
}

// Per-user config: LOOPBOARD_CONFIG_DIR wins (tests), then %APPDATA% on
// Windows, then $XDG_CONFIG_HOME, then ~/.config.
export function configDir(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): string {
  if (env.LOOPBOARD_CONFIG_DIR) return resolve(env.LOOPBOARD_CONFIG_DIR);
  if (platform === "win32" && env.APPDATA) return join(env.APPDATA, "loopboard");
  const xdg = env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(xdg, "loopboard");
}
