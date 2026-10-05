import { existsSync, readdirSync, statSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { serialized, writeFileAtomic } from "./files";

// One running loopboard remembers many repos (ADR-0002, #0008).
export interface Workspace {
  id: string;
  name: string;
  repoPath: string;
  root: string;
}

export interface Registry {
  workspaces: Workspace[];
  lastUsed?: string;
}

export interface WorkspaceSummary extends Workspace {
  available: boolean;
  issueCount: number;
}

const ROOT_CANDIDATES = [".agents", "ai"] as const;

function isRoot(dir: string): boolean {
  try {
    return statSync(join(dir, "issues")).isDirectory();
  } catch {
    return false;
  }
}

// The user points at a repo root; `.agents/` wins over a legacy `ai/`
// (ADR-0003). A path that is itself a root (has issues/) is accepted too.
export function detectRoot(path: string): { repoPath: string; root: string } | null {
  const abs = resolve(path);
  for (const candidate of ROOT_CANDIDATES) {
    const root = join(abs, candidate);
    if (isRoot(root)) return { repoPath: abs, root };
  }
  if (isRoot(abs)) {
    const name = basename(abs);
    const repoPath = (ROOT_CANDIDATES as readonly string[]).includes(name) ? dirname(abs) : abs;
    return { repoPath, root: abs };
  }
  return null;
}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "workspace";
}

function registryFile(configDir: string): string {
  return join(configDir, "workspaces.json");
}

export async function loadRegistry(configDir: string): Promise<Registry> {
  try {
    const raw = JSON.parse(await readFile(registryFile(configDir), "utf8")) as Partial<Registry>;
    const workspaces = Array.isArray(raw.workspaces)
      ? raw.workspaces.filter(
          (w): w is Workspace =>
            !!w && typeof w.id === "string" && typeof w.root === "string" && typeof w.repoPath === "string"
        )
      : [];
    return {
      workspaces: workspaces.map((w) => ({ ...w, name: typeof w.name === "string" ? w.name : w.id })),
      lastUsed: typeof raw.lastUsed === "string" ? raw.lastUsed : undefined,
    };
  } catch {
    return { workspaces: [] };
  }
}

export async function saveRegistry(configDir: string, registry: Registry): Promise<void> {
  await mkdir(configDir, { recursive: true });
  await writeFileAtomic(registryFile(configDir), JSON.stringify(registry, null, 2) + "\n");
}

// Read-modify-write, one at a time per config dir: two requests at once
// (say, opening a workspace while adding another) must not drop an update.
function updateRegistry<T>(configDir: string, change: (registry: Registry) => T): Promise<T> {
  return serialized(`registry:${configDir}`, async () => {
    const registry = await loadRegistry(configDir);
    const before = JSON.stringify(registry);
    const result = change(registry);
    if (JSON.stringify(registry) !== before) await saveRegistry(configDir, registry);
    return result;
  });
}

export class RootNotFoundError extends Error {
  readonly statusCode = 422;
  constructor(path: string) {
    super(`No .agents/ or ai/ folder with issues/ found in ${path}. Run \`loopboard init\` there first.`);
  }
}

// Registers (or re-selects) the repo at `path`; deduplicated by root.
export async function registerWorkspace(configDir: string, path: string): Promise<Workspace> {
  const found = detectRoot(path);
  if (!found) throw new RootNotFoundError(resolve(path));
  return updateRegistry(configDir, (registry) => {
    let workspace = registry.workspaces.find((w) => resolve(w.root) === found.root);
    if (!workspace) {
      const base = slugify(basename(found.repoPath));
      const taken = new Set(registry.workspaces.map((w) => w.id));
      let id = base;
      for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
      workspace = { id, name: basename(found.repoPath), repoPath: found.repoPath, root: found.root };
      registry.workspaces.push(workspace);
    }
    registry.lastUsed = workspace.id;
    return workspace;
  });
}

export async function renameWorkspace(configDir: string, id: string, name: string): Promise<Workspace | null> {
  return updateRegistry(configDir, (registry) => {
    const workspace = registry.workspaces.find((w) => w.id === id);
    if (!workspace) return null;
    workspace.name = name.trim() || workspace.name;
    return workspace;
  });
}

// Forgets a workspace; never touches its files.
export async function removeWorkspace(configDir: string, id: string): Promise<boolean> {
  return updateRegistry(configDir, (registry) => {
    const next = registry.workspaces.filter((w) => w.id !== id);
    if (next.length === registry.workspaces.length) return false;
    registry.workspaces = next;
    if (registry.lastUsed === id) registry.lastUsed = next[0]?.id;
    return true;
  });
}

export async function setLastUsed(configDir: string, id: string): Promise<void> {
  return updateRegistry(configDir, (registry) => {
    if (registry.workspaces.some((w) => w.id === id)) registry.lastUsed = id;
  });
}

const ISSUE_FILE_RE = /^\d{4}-[^/]+\.md$/;

export function summarize(workspace: Workspace): WorkspaceSummary {
  const available = existsSync(join(workspace.root, "issues"));
  let issueCount = 0;
  if (available) {
    try {
      issueCount = readdirSync(join(workspace.root, "issues")).filter((f) => ISSUE_FILE_RE.test(f)).length;
    } catch {
      issueCount = 0;
    }
  }
  return { ...workspace, available, issueCount };
}
