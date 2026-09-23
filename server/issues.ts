import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
// The tracker root holds the bundled `ai/` blueprint. Sibling project repos
// (morningmail, webhighlights, …) are reached by `../<repo>/ai` from here.
export const REPO_ROOT = resolve(MODULE_DIR, "..");

// `resolve` (unlike `join`) honors absolute paths in `basePath`, so callers
// can point at an `ai/` directory anywhere on disk via BASE_PATH=/abs/path.
export function resolveBaseDir(basePath: string) {
  return resolve(REPO_ROOT, basePath);
}

function getIssuesDir(basePath: string) {
  return join(resolveBaseDir(basePath), "issues");
}

function getArchiveDir(basePath: string) {
  return join(getIssuesDir(basePath), "_archive");
}

function getProjectsDir(basePath: string) {
  return join(resolveBaseDir(basePath), "projects");
}

export const WORKFLOW_STATUSES = [
  "todo",
  "in-progress",
  "in-review",
  "done",
] as const;
export const SIDE_STATUSES = ["blocked", "wontfix"] as const;
// Pre-workflow stage: captured idea, not yet scheduled (#0145).
export const PRE_WORKFLOW_STATUSES = ["backlog"] as const;
export const ALL_STATUSES = [
  ...PRE_WORKFLOW_STATUSES,
  ...WORKFLOW_STATUSES,
  ...SIDE_STATUSES,
] as const;

export const ASSIGNEES = ["agent", "human"] as const;

export type Status = (typeof ALL_STATUSES)[number];
export type Assignee = (typeof ASSIGNEES)[number];

export interface Issue {
  id: string;
  filename: string;
  archived: boolean;
  title: string;
  category: "user-story" | "task" | "bug" | string;
  status: Status;
  assignee: Assignee;
  project?: string;
  phase?: number;
  parent?: string;
  labels: string[];
  created?: string;
  // Sort rank within a column (1 = top). Not severity. Optional;
  // unprioritized issues sort after prioritized ones, by id.
  priority?: number;
  body: string;
}

export interface Project {
  slug: string;
  title: string;
  status: "active" | "shipped" | "paused" | "unknown";
  prdPath: string;
  wipPath: string;
  prdBody: string;
  wipBody: string;
}

const FILENAME_RE = /^(\d{4})-[a-z0-9-]+\.md$/;

// 4-digit zero-padded ID parsed from a frontmatter field. The filename's
// captured group is the trustworthy fallback because js-yaml (YAML 1.1)
// implicit-types unquoted values like 0070 as octal (56), so trusting
// `fm.id` directly silently corrupts every issue whose digits are all 0–7.
function normalizeId(value: unknown, fallback: string): string {
  if (typeof value === "number") return String(value).padStart(4, "0");
  if (typeof value === "string" && value.length > 0)
    return value.padStart(4, "0");
  return fallback;
}

async function readIssuesFromDir(
  dir: string,
  archived: boolean
): Promise<Issue[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const issues: Issue[] = [];
  for (const entry of entries) {
    const fileMatch = entry.match(FILENAME_RE);
    if (!fileMatch) continue;
    const filenameId = fileMatch[1];
    const full = join(dir, entry);
    const s = await stat(full);
    if (!s.isFile()) continue;
    const raw = await readFile(full, "utf8");
    // A single malformed issue file (e.g. an unquoted colon in `title:`)
    // must not 500 the whole `/api/data` response. PRD §"Testing decisions"
    // mandates "malformed files skipped". See #0095.
    let parsed: ReturnType<typeof matter>;
    try {
      parsed = matter(raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[tracker] skipping ${entry}: ${msg}`);
      continue;
    }
    const fm = parsed.data as Record<string, unknown>;
    // Filename is canonical for IDs; frontmatter `id:` is unreliable.
    const id = filenameId;
    const status = String(fm.status ?? "todo") as Status;
    const rawAssignee =
      fm.assignee !== undefined ? String(fm.assignee) : "agent";
    const assignee: Assignee = (ASSIGNEES as readonly string[]).includes(
      rawAssignee
    )
      ? (rawAssignee as Assignee)
      : "agent";
    const priority =
      typeof fm.priority === "number" &&
      Number.isFinite(fm.priority) &&
      fm.priority >= 1
        ? Math.floor(fm.priority)
        : undefined;
    issues.push({
      id,
      filename: entry,
      archived,
      title: String(fm.title ?? entry),
      category: String(fm.category ?? "task"),
      status,
      assignee,
      project: fm.project ? String(fm.project) : undefined,
      phase: typeof fm.phase === "number" ? fm.phase : undefined,
      parent:
        fm.parent !== undefined
          ? normalizeId(fm.parent, "") || undefined
          : undefined,
      labels: Array.isArray(fm.labels) ? fm.labels.map(String) : [],
      created: fm.created ? String(fm.created) : undefined,
      priority,
      body: parsed.content,
    });
  }
  return issues;
}

export async function readAllIssues(basePath = "ai"): Promise<Issue[]> {
  const issuesDir = getIssuesDir(basePath);
  const archiveDir = getArchiveDir(basePath);
  const [active, archived] = await Promise.all([
    readIssuesFromDir(issuesDir, false),
    readIssuesFromDir(archiveDir, true),
  ]);
  return [...active, ...archived].sort((a, b) => a.id.localeCompare(b.id));
}

export async function readAllProjects(basePath = "ai"): Promise<Project[]> {
  const projectsDir = getProjectsDir(basePath);
  let entries: string[];
  try {
    entries = await readdir(projectsDir);
  } catch {
    return [];
  }
  const projects: Project[] = [];
  for (const entry of entries) {
    if (!/^\d{2}-[a-z0-9-]+$/.test(entry)) continue;
    const folder = join(projectsDir, entry);
    const s = await stat(folder);
    if (!s.isDirectory()) continue;
    const wipPath = join(folder, "wip.md");
    const prdPath = join(folder, "prd.md");
    let status: Project["status"] = "unknown";
    let title = entry;
    let wipBody = "";
    let prdBody = "";
    const [wipResult, prdResult] = await Promise.all([
      readFile(wipPath, "utf8").catch(() => ""),
      readFile(prdPath, "utf8").catch(() => ""),
    ]);
    wipBody = wipResult;
    prdBody = prdResult;
    if (wipBody) {
      const titleMatch = wipBody.match(/^#\s+(.+?)\s*$/m);
      if (titleMatch) title = titleMatch[1].replace(/\s*[—–-]\s*WIP\s*$/, "");
      const statusLine = wipBody.match(/^>\s*Status:\s*([a-z-]+)/im);
      if (statusLine) {
        const candidate = statusLine[1] as Project["status"];
        if (
          ["active", "shipped", "paused", "in-progress"].includes(candidate)
        ) {
          status =
            candidate === ("in-progress" as Project["status"])
              ? "active"
              : candidate;
        }
      }
    }
    projects.push({
      slug: entry,
      title,
      status,
      prdPath,
      wipPath,
      prdBody,
      wipBody,
    });
  }
  return projects.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function findIssueFile(
  id: string,
  archived: boolean,
  basePath = "ai"
): string | null {
  const dir = archived ? getArchiveDir(basePath) : getIssuesDir(basePath);
  return _findIssueFileSync(dir, id);
}

import { readdirSync } from "node:fs";

function _findIssueFileSync(dir: string, id: string): string | null {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  const match = entries.find(
    (e) => e.startsWith(`${id}-`) && e.endsWith(".md")
  );
  return match ? join(dir, match) : null;
}
