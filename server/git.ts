import { execFileSync } from "node:child_process";
import { existsSync, realpathSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

// Read-only git plumbing shared by the ID allocator and issue activity.
export function git(cwd: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 16 * 1024 * 1024 });
  } catch {
    return null;
  }
}

// The repo top and `path` relative to it — on real paths, because git
// reports them (macOS /var → /private/var). Null outside git.
export function gitLocate(path: string): { top: string; rel: string } | null {
  const abs = resolve(path);
  if (!existsSync(abs)) return null;
  const real = realpathSync.native(abs);
  const cwd = statSync(real).isDirectory() ? real : dirname(real);
  const top = git(cwd, ["rev-parse", "--show-toplevel"])?.trim();
  if (!top) return null;
  return { top, rel: relative(top, real).split("\\").join("/") };
}
