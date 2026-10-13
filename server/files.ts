import { randomUUID } from "node:crypto";
import { mkdir, open, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// Write to a temp file and rename over the target, so a crash or a watcher
// never sees a half-written file.
export async function writeFileAtomic(path: string, content: string): Promise<void> {
  // Unique per call: two writes in the same millisecond must not share a temp file.
  const tmp = `${path}.${randomUUID()}.tmp`;
  await writeFile(tmp, content, "utf8");
  await rename(tmp, path);
}

// One read-modify-write at a time per key (a file path, a config dir), so two
// requests at once can't drop each other's change.
const queues = new Map<string, Promise<unknown>>();
export function serialized<T>(key: string, run: () => Promise<T>): Promise<T> {
  const next = (queues.get(key) ?? Promise.resolve()).then(run, run);
  const settled = next.catch(() => undefined);
  queues.set(key, settled);
  void settled.then(() => {
    if (queues.get(key) === settled) queues.delete(key);
  });
  return next;
}

const LOCK_RETRY_MS = 20;
// A write takes milliseconds: an older lock was left by a process that died.
const LOCK_STALE_MS = 5000;

// `serialized` across processes, for a file a running board and the CLI both
// write (#0099): `run` holds `<path>.lock`, and everyone else waits for it.
export async function withFileLock<T>(path: string, run: () => Promise<T>): Promise<T> {
  const lock = `${path}.lock`;
  for (;;) {
    try {
      await (await open(lock, "wx")).close();
      break;
    } catch (err) {
      const code = err instanceof Error && "code" in err ? err.code : "";
      if (code === "EEXIST") {
        const age = await stat(lock).then((s) => Date.now() - s.mtimeMs, () => 0);
        if (age > LOCK_STALE_MS) await rm(lock, { force: true });
        else await new Promise((r) => setTimeout(r, LOCK_RETRY_MS));
      } else if (code !== "ENOENT" || !(await mkdir(dirname(lock), { recursive: true }).then(() => true, () => false))) {
        // A folder that takes no lock file (read-only): as without one.
        return run();
      }
    }
  }
  try {
    return await run();
  } finally {
    await rm(lock, { force: true });
  }
}

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export { yamlScalar } from "../shared/frontmatter";
