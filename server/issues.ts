import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readField } from "../shared/frontmatter";
import { parseFrontmatter } from "./frontmatter";
import { matchName, NAME_HINT } from "./names";
import { parseProjectDigest, type ProjectDigest } from "./wip";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
// The tracker repo dogfoods its own `.agents/` root; other repos are reached
// via BASE_PATH (relative to this repo or absolute).
export const REPO_ROOT = resolve(MODULE_DIR, "..");
export const DEFAULT_BASE_PATH = ".agents";

// `resolve` (unlike `join`) honors absolute paths in `basePath`, so callers
// can point at a root anywhere on disk via BASE_PATH=/abs/path.
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
  reviewed?: string;
  deployed?: string;
  body: string;
}

export interface Project extends ProjectDigest {
  slug: string;
  title: string;
  status: "active" | "shipped" | "paused" | "unknown";
  prdPath: string;
  wipPath: string;
  prdBody: string;
  wipBody: string;
}

// A file or folder the reader can't show, relative to the root. Reported to
// the board and `loopboard check`, never dropped (#0071).
export interface SkippedFile {
  file: string;
  reason: string;
}

// js-yaml parses an unquoted `created: 2026-09-16` into a Date; keep the
// ISO day so the client can sort and group without timezone drift.
export function normalizeCreated(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

// 4-digit zero-padded ID from a raw frontmatter line. Never from the parsed
// YAML: js-yaml (YAML 1.1) types an unquoted 0070 as octal (56), corrupting
// every ID whose digits are all 0–7 (#0059). `id` comes from the filename.
function normalizeId(value: string | undefined): string | undefined {
  return value ? value.padStart(4, "0") : undefined;
}

function unreadable(err: unknown): string {
  const code = err instanceof Error && "code" in err ? String(err.code) : "";
  return code ? `can't be read (${code})` : "can't be read";
}

async function readIssuesFromDir(
  dir: string,
  archived: boolean
): Promise<{ issues: Issue[]; skipped: SkippedFile[] }> {
  const issues: Issue[] = [];
  const skipped: SkippedFile[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return { issues, skipped };
  }
  for (const entry of entries) {
    const match = matchName("issue", entry);
    if (!match) continue;
    // One bad file (a near-miss name, a placeholder that won't hydrate, an
    // unquoted colon in `title:`) must neither 500 `/api/w/:id/data` nor
    // vanish (#0042, #0071).
    const skip = (reason: string) =>
      skipped.push({ file: `issues/${archived ? "_archive/" : ""}${entry}`, reason });
    if (!match.valid) {
      skip(NAME_HINT.issue);
      continue;
    }
    let raw: string;
    try {
      raw = await readFile(join(dir, entry), "utf8");
    } catch (err) {
      skip(unreadable(err));
      continue;
    }
    let parsed: ReturnType<typeof parseFrontmatter>;
    try {
      parsed = parseFrontmatter(raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      skip(`invalid frontmatter: ${msg.split("\n")[0].replace(/:$/, "")}`);
      continue;
    }
    const fm = parsed.data as Record<string, unknown>;
    // Filename is canonical for IDs; frontmatter `id:` is unreliable.
    const id = match.id;
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
      parent: normalizeId(readField(parsed.matter, "parent")),
      labels: Array.isArray(fm.labels) ? fm.labels.map(String) : [],
      created: normalizeCreated(fm.created),
      reviewed: normalizeCreated(fm.reviewed),
      deployed: normalizeCreated(fm.deployed),
      priority,
      body: parsed.content,
    });
  }
  return { issues, skipped };
}

async function scanIssues(basePath: string): Promise<{ issues: Issue[]; skipped: SkippedFile[] }> {
  const [active, archived] = await Promise.all([
    readIssuesFromDir(getIssuesDir(basePath), false),
    readIssuesFromDir(getArchiveDir(basePath), true),
  ]);
  return {
    issues: [...active.issues, ...archived.issues].sort((a, b) => a.id.localeCompare(b.id)),
    skipped: [...active.skipped, ...archived.skipped],
  };
}

export async function readAllIssues(basePath = DEFAULT_BASE_PATH): Promise<Issue[]> {
  return (await scanIssues(basePath)).issues;
}

async function scanProjects(basePath: string): Promise<{ projects: Project[]; skipped: SkippedFile[] }> {
  const projectsDir = getProjectsDir(basePath);
  const projects: Project[] = [];
  const skipped: SkippedFile[] = [];
  let entries: string[];
  try {
    entries = await readdir(projectsDir);
  } catch {
    return { projects, skipped };
  }
  for (const entry of entries) {
    const match = matchName("project", entry);
    if (!match) continue;
    const folder = join(projectsDir, entry);
    let isFolder: boolean;
    try {
      isFolder = (await stat(folder)).isDirectory();
    } catch (err) {
      skipped.push({ file: `projects/${entry}`, reason: unreadable(err) });
      continue;
    }
    if (!isFolder) continue;
    if (!match.valid) {
      skipped.push({ file: `projects/${entry}`, reason: NAME_HINT.project });
      continue;
    }
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
      ...parseProjectDigest(wipBody, prdBody),
    });
  }
  return { projects: projects.sort((a, b) => a.slug.localeCompare(b.slug)), skipped };
}

export async function readAllProjects(basePath = DEFAULT_BASE_PATH): Promise<Project[]> {
  return (await scanProjects(basePath)).projects;
}

// What the board shows for a root, plus what it had to skip (#0071).
export async function readBoard(
  basePath = DEFAULT_BASE_PATH
): Promise<{ issues: Issue[]; projects: Project[]; skipped: SkippedFile[] }> {
  const [issues, projects] = await Promise.all([scanIssues(basePath), scanProjects(basePath)]);
  return {
    issues: issues.issues,
    projects: projects.projects,
    // Plain code-unit order: the same list on every platform and locale.
    skipped: [...issues.skipped, ...projects.skipped].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0)),
  };
}

export function findIssueFile(
  id: string,
  archived: boolean,
  basePath = DEFAULT_BASE_PATH
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
  // The same matcher as the reader, so a write can't land in a skipped twin.
  const match = entries.find((e) => {
    const m = matchName("issue", e);
    return m?.valid && m.id === id;
  });
  return match ? join(dir, match) : null;
}
