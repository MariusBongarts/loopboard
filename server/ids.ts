import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { issueRefs } from "../shared/refs";
import { git, gitLocate } from "./git";
import { matchName, type IdKind } from "./names";

// Sequential, branch-aware IDs (ADR-0004, #0016–#0018). Issues are 4-digit
// (`NNNN-slug.md`), projects 2-digit (`NN-slug/`).

export type { IdKind };

export interface IdSighting {
  id: string;
  name: string; // file or folder name, e.g. 0091-crash-on-empty-wip.md
  where: string; // "working tree", "worktree <path>", "branch <ref>"
}

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

function isFolder(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export interface NumberedName {
  id: string;
  name: string;
  dir: string; // relative to root, e.g. issues/_archive
}

// Every name under the root that takes a number. A near-miss name does too:
// the board reports the file as skipped, and renaming it must not collide
// with a newer issue (#0071). In projects/ only folders count.
export function numberedNames(root: string, kind: IdKind): NumberedName[] {
  const out: NumberedName[] = [];
  for (const dir of idDirs(kind)) {
    for (const name of namesIn(join(root, dir))) {
      const id = matchName(kind, name)?.id;
      if (id && (kind === "issue" || isFolder(join(root, dir, name)))) out.push({ id, name, dir });
    }
  }
  return out;
}

function fromDisk(root: string, kind: IdKind, where: string): IdSighting[] {
  return numberedNames(root, kind).map(({ id, name }) => ({ id, name, where }));
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
      // `-z`: one `<mode> <type> <object>\t<path>` per entry, names unquoted.
      const listing = git(top, ["ls-tree", "-z", ref, `${rootRel ? `${rootRel}/` : ""}${dir}/`]);
      for (const entry of (listing ?? "").split("\0")) {
        const tab = entry.indexOf("\t");
        const name = entry.slice(tab + 1).split("/").pop() ?? "";
        const id = matchName(kind, name)?.id;
        const counts = kind === "issue" || entry.slice(0, tab).split(" ")[1] === "tree";
        if (id && counts) sightings.push({ id, name, where: `branch ${ref}` });
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
      let text: string;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        // Unreadable, so nothing to check. The board's skipped list names
        // issue files and a project's wip.md and prd.md (#0071).
        continue;
      }
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
