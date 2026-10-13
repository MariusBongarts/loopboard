import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { issueRefs } from "../shared/refs";
import { git, gitLocate } from "./git";

// Sequential, branch-aware IDs (ADR-0004, #0016–#0018). Issues are 4-digit
// (`NNNN-slug.md`), projects 2-digit (`NN-slug/`).

export type IdKind = "issue" | "project";

export interface IdSighting {
  id: string;
  name: string; // file or folder name, e.g. 0091-crash-on-empty-wip.md
  where: string; // "working tree", "worktree <path>", "branch <ref>"
}

const ISSUE_RE = /^(\d{4})-.+\.md$/;
const PROJECT_RE = /^(\d{2})-[a-z0-9-]+$/;

export const ID_WIDTH: Record<IdKind, number> = { issue: 4, project: 2 };

function namesIn(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function idDirs(kind: IdKind): string[] {
  return kind === "issue" ? ["issues", "issues/_archive"] : ["projects"];
}

function match(kind: IdKind, name: string): string | null {
  const m = name.match(kind === "issue" ? ISSUE_RE : PROJECT_RE);
  return m ? m[1] : null;
}

function fromDisk(root: string, kind: IdKind, where: string): IdSighting[] {
  const out: IdSighting[] = [];
  for (const dir of idDirs(kind)) {
    for (const name of namesIn(join(root, dir))) {
      const id = match(kind, name);
      if (id) out.push({ id, name, where });
    }
  }
  return out;
}

// Every place an ID can already be taken: this working tree, other worktrees'
// working copies (uncommitted files count), and every local and
// remote-tracking branch. Outside git, just the folder.
export function collectIds(root: string, kind: IdKind, opts: { git?: boolean } = {}): IdSighting[] {
  const absRoot = resolve(root);
  const sightings = fromDisk(absRoot, kind, "working tree");
  if (opts.git === false) return sightings;
  const located = gitLocate(absRoot);
  if (!located) return sightings;
  const { top, rel: rootRel } = located;

  const worktrees = (git(top, ["worktree", "list", "--porcelain"]) ?? "")
    .split("\n")
    .filter((l) => l.startsWith("worktree "))
    .map((l) => l.slice("worktree ".length).trim())
    .filter((p) => resolve(p) !== resolve(top));
  for (const wt of worktrees) {
    const wtRoot = join(wt, rootRel);
    if (existsSync(wtRoot)) sightings.push(...fromDisk(wtRoot, kind, `worktree ${wt}`));
  }

  const refs = (git(top, ["for-each-ref", "--format=%(refname:short)", "refs/heads", "refs/remotes"]) ?? "")
    .split("\n")
    .map((r) => r.trim())
    .filter((r) => r && !r.endsWith("/HEAD"));
  for (const ref of refs) {
    for (const dir of idDirs(kind)) {
      const listing = git(top, ["ls-tree", "--name-only", ref, `${rootRel ? `${rootRel}/` : ""}${dir}/`]);
      for (const path of (listing ?? "").split("\n")) {
        const name = path.split("/").pop() ?? "";
        const id = match(kind, name);
        if (id) sightings.push({ id, name, where: `branch ${ref}` });
      }
    }
  }
  return sightings;
}

export function nextId(root: string, kind: IdKind): string {
  const max = collectIds(root, kind).reduce((m, s) => Math.max(m, Number(s.id)), 0);
  return String(max + 1).padStart(ID_WIDTH[kind], "0");
}

// ── check (#0017) ────────────────────────────────────────────────────

export interface Duplicate {
  kind: IdKind;
  id: string;
  names: { name: string; where: string }[];
}

export interface DanglingRef {
  file: string; // relative to root
  ref: string; // e.g. "parent: 0042" or "#0042"
}

export interface CheckReport {
  duplicates: Duplicate[];
  dangling: DanglingRef[];
}

// Two different names sharing a number are a collision; the same name on
// several branches is the same issue and fine.
export function findDuplicates(sightings: IdSighting[], kind: IdKind, branches: boolean): Duplicate[] {
  const pool = branches ? sightings : sightings.filter((s) => s.where === "working tree");
  const byId = new Map<string, Map<string, string>>();
  for (const s of pool) {
    const names = byId.get(s.id) ?? new Map<string, string>();
    if (!names.has(s.name)) names.set(s.name, s.where);
    byId.set(s.id, names);
  }
  return [...byId.entries()]
    .filter(([, names]) => names.size > 1)
    .map(([id, names]) => ({ kind, id, names: [...names.entries()].map(([name, where]) => ({ name, where })) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

const PARENT_RE = /^parent:\s*["']?(\d{1,4})["']?\s*$/m;
// Code (fenced blocks, `inline`) holds examples, not references.
const CODE_RE = /^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$|`[^`\n]+`/gm;

function markdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of namesIn(dir)) {
    const full = join(dir, entry);
    if (entry.startsWith("_templates")) continue;
    if (entry.endsWith(".md")) out.push(full);
    else if (!entry.includes(".")) out.push(...markdownFiles(full));
  }
  return out;
}

export function findDangling(root: string): DanglingRef[] {
  const known = new Set(fromDisk(root, "issue", "working tree").map((s) => s.id));
  const out: DanglingRef[] = [];
  for (const area of ["issues", "projects", "specs"]) {
    for (const file of markdownFiles(join(root, area))) {
      const text = readFileSync(file, "utf8");
      const rel = relative(root, file).split("\\").join("/");
      const parent = text.match(PARENT_RE)?.[1]?.padStart(4, "0");
      if (parent && !known.has(parent)) out.push({ file: rel, ref: `parent: ${parent}` });
      const seen = new Set<string>();
      for (const { id } of issueRefs(text.replace(CODE_RE, ""))) {
        if (known.has(id) || seen.has(id)) continue;
        seen.add(id);
        out.push({ file: rel, ref: `#${id}` });
      }
    }
  }
  return out;
}

export function checkRoot(root: string, branches: boolean): CheckReport {
  return {
    duplicates: [
      ...findDuplicates(collectIds(root, "issue", { git: branches }), "issue", branches),
      ...findDuplicates(collectIds(root, "project", { git: branches }), "project", branches),
    ],
    dangling: findDangling(root),
  };
}
