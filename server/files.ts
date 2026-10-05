import { randomUUID } from "node:crypto";
import { rename, writeFile } from "node:fs/promises";

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

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export { yamlScalar } from "../shared/frontmatter";
