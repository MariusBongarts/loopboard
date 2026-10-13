import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { printable } from "../shared/printable";
import { issueRefs, replaceIssueRefs } from "../shared/refs";
import { ID_WIDTH, nextId, numberedNames, type IdKind } from "./ids";

// `loopboard renumber <old> [new]` (#0018): move an issue or project to a
// new number and rewrite every reference under the root.

export interface RenumberOptions {
  root: string;
  oldId: string;
  newId?: string;
  file?: string; // pick one of several files sharing the old number
}

export interface Edit {
  file: string; // relative to root
  before: string;
  after: string;
}

export interface RenumberPlan {
  kind: IdKind;
  from: string; // relative path
  to: string;
  newId: string;
  edits: Edit[];
  ambiguous: string[]; // files with references that may mean the other twin
}

export class RenumberError extends Error {}

function walkMarkdown(dir: string): string[] {
  const out: string[] = [];
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (entry.endsWith(".md")) out.push(full);
    else if (!entry.includes(".")) out.push(...walkMarkdown(full));
  }
  return out;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rel(root: string, p: string): string {
  return relative(root, p).split("\\").join("/");
}

export function planRenumber(opts: RenumberOptions): RenumberPlan {
  const { root } = opts;
  const kind: IdKind | null = /^\d{4}$/.test(opts.oldId) ? "issue" : /^\d{2}$/.test(opts.oldId) ? "project" : null;
  if (!kind) throw new RenumberError(`"${opts.oldId}" is neither a 4-digit issue nor a 2-digit project number`);
  const newId = opts.newId ?? nextId(root, kind);
  if (!new RegExp(`^\\d{${ID_WIDTH[kind]}}$`).test(newId)) {
    throw new RenumberError(`the new number must have ${ID_WIDTH[kind]} digits, like ${opts.oldId}`);
  }
  // The allocator's own list, so `check` and `renumber` agree on which files
  // hold a number: a near miss such as `0002_Tax_Return.md` does (#0071).
  const candidates = numberedNames(root, kind)
    .filter((n) => n.id === opts.oldId)
    .map((n) => `${n.dir}/${n.name}`);
  if (candidates.length === 0) throw new RenumberError(`no ${kind} numbered ${opts.oldId} under ${root}`);
  const listed = candidates.map((c) => `\n  ${printable(c)}`).join("");
  let from = candidates[0];
  if (opts.file) {
    // --file is binding: never move another file that has the number.
    const wanted = opts.file.split(/[\\/]/).pop();
    const pick = candidates.find((c) => c === opts.file) ?? candidates.find((c) => c.split("/").pop() === wanted);
    if (!pick) throw new RenumberError(`--file ${printable(opts.file)} names no ${kind} numbered ${opts.oldId}. It can be:${listed}`);
    from = pick;
  } else if (candidates.length > 1) {
    throw new RenumberError(`${candidates.length} files share ${opts.oldId}:${listed}\nPick one with --file <name>.`);
  }
  const name = from.split("/").pop()!;
  // Whatever follows the number stays: `-slug.md`, or a near miss's `_Tax_Return.md`.
  const newName = `${newId}${name.slice(opts.oldId.length)}`;
  const to = from.slice(0, from.length - name.length) + newName;
  if (existsSync(join(root, to))) throw new RenumberError(`${to} already exists`);

  const twins = candidates.length > 1;
  const edits: Edit[] = [];
  const ambiguous: string[] = [];
  for (const file of walkMarkdown(root)) {
    let before: string;
    try {
      before = readFileSync(file, "utf8");
    } catch {
      // Unreadable (or a folder named like a file): nothing to rewrite.
      continue;
    }
    let after = before;
    const fileRel = rel(root, file);
    const isSelf = kind === "issue" ? fileRel === from : fileRel.startsWith(`${from}/`);
    if (kind === "issue") {
      // Links name the slug, so they're unambiguous even with twins.
      after = after.split(`/${name}`).join(`/${newName}`).split(`(${name})`).join(`(${newName})`);
      if (isSelf) after = after.replace(new RegExp(`^id:\\s*["']?${opts.oldId}["']?\\s*$`, "m"), `id: ${newId}`);
      const parent = new RegExp(`^(parent:\\s*)["']?${opts.oldId}["']?\\s*$`, "m");
      if (!twins || isSelf) {
        after = replaceIssueRefs(after, opts.oldId, newId).replace(parent, `$1${newId}`);
      } else if (issueRefs(after).some((r) => r.id === opts.oldId) || parent.test(after)) {
        ambiguous.push(fileRel);
      }
    } else {
      after = after
        .split(`projects/${name}/`).join(`projects/${newName}/`)
        .replace(new RegExp(`^(project:\\s*)${escapeRegExp(name)}\\s*$`, "m"), (_, field: string) => field + newName);
    }
    if (after !== before) edits.push({ file: isSelf && kind === "issue" ? to : fileRel, before, after });
  }
  return { kind, from, to, newId, edits, ambiguous };
}

export function applyRenumber(root: string, plan: RenumberPlan): void {
  renameSync(join(root, plan.from), join(root, plan.to));
  for (const e of plan.edits) {
    const target = plan.kind === "project" && e.file.startsWith(`${plan.from}/`)
      ? plan.to + e.file.slice(plan.from.length)
      : e.file;
    writeFileSync(join(root, target), e.after, "utf8");
  }
}
