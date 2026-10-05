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

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export { yamlScalar } from "../shared/frontmatter";
