import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { writeFileAtomic } from "./files";

// Saved list views (#0032) are personal, so they live in the per-user config
// next to the workspace registry — never in the repo.
export interface SavedView {
  id: string;
  name: string;
  query: Record<string, string>;
}

export function viewsFile(configDir: string, workspace: string): string {
  return join(configDir, "views", `${workspace}.json`);
}

export async function loadViews(configDir: string, workspace: string): Promise<SavedView[]> {
  try {
    const raw = JSON.parse(await readFile(viewsFile(configDir, workspace), "utf8")) as { views?: unknown };
    return Array.isArray(raw.views)
      ? raw.views.filter(
          (v): v is SavedView =>
            !!v && typeof v.id === "string" && typeof v.name === "string" && typeof v.query === "object" && v.query !== null
        )
      : [];
  } catch {
    return [];
  }
}

export async function saveViews(configDir: string, workspace: string, views: SavedView[]): Promise<void> {
  const file = viewsFile(configDir, workspace);
  await mkdir(join(configDir, "views"), { recursive: true });
  await writeFileAtomic(file, JSON.stringify({ views }, null, 2) + "\n");
}

export function validViews(input: unknown): SavedView[] | null {
  if (!Array.isArray(input)) return null;
  const out: SavedView[] = [];
  for (const v of input) {
    if (!v || typeof v !== "object") return null;
    const { id, name, query } = v as Record<string, unknown>;
    if (typeof id !== "string" || typeof name !== "string" || !name.trim() || typeof query !== "object" || query === null) return null;
    const q: Record<string, string> = {};
    for (const [k, val] of Object.entries(query)) if (typeof val === "string") q[k] = val;
    out.push({ id, name: name.trim(), query: q });
  }
  return out;
}
