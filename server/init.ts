import { createHash } from "node:crypto";
import { cpSync, existsSync, readFileSync, readdirSync, statSync, symlinkSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { printable, quoted } from "../shared/printable";
import { todayIso } from "./files";
import { ID_RULE, IDENTITY_FILE, idProblem, readIdentity, renderIdentity } from "./identity";
import { latestMigration, MIGRATION_RE } from "./migrations";
import { detectRoot, loadRegistry, sameRoot, slugify, type Workspace } from "./workspaces";

// `loopboard init` / `init --upgrade` (#0011, #0012). Everything is planned
// first, so --dry-run and tests see exactly what a real run would do.

// What `--kind` names (ADR-0007). `docs` is a harness without code (#0078).
export const SCAFFOLDS = ["code", "docs"] as const;
export type Scaffold = (typeof SCAFFOLDS)[number];

export const CORE_SKILLS = [
  "grill-me",
  "grill-with-docs",
  "to-prd",
  "to-issues",
  "implement",
  "triage",
  "issue-grooming",
  "upgrade-harness",
] as const;
export const EXTRA_SKILLS = ["tdd", "diagnose", "improve-codebase-architecture", "write-a-skill"] as const;

const BLOCK_START = "<!-- loopboard:start";
const BLOCK_END = "<!-- loopboard:end -->";
const MANIFEST = ".agents/.loopboard/manifest.json";

export type ActionKind =
  | "create" // new file
  | "update" // shipped file, unmodified locally → newer version
  | "same" // already identical
  | "keep" // exists; seeded once or edited locally — left alone
  | "keep-modified" // shipped file edited locally — upgrade skips it
  | "link" // tool skill link (.claude/.cursor)
  | "block"; // AGENTS.md managed block appended or refreshed

export interface Action {
  path: string; // relative to the repo
  kind: ActionKind;
  content?: string;
  linkTarget?: string;
  managed?: boolean; // tracked in the manifest
  note?: string;
}

export interface InitOptions {
  repoPath: string;
  packageRoot: string;
  withExtras?: boolean;
  upgrade?: boolean;
  force?: boolean;
  kind?: string; // --kind as typed
  // The identity file's fields (#0078); the registry in `configDir` is read
  // before an id is settled.
  id?: string;
  name?: string;
  parent?: string;
  configDir?: string;
  today?: string;
}

export class InitError extends Error {}

function sha(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

// The docs scaffold's own sources sit in scaffold/docs (#0078).
function scaffoldDir(packageRoot: string, scaffold: Scaffold): string {
  return scaffold === "docs" ? join(packageRoot, "scaffold", "docs") : join(packageRoot, "scaffold");
}

export function renderBlock(packageRoot: string, migration: string, scaffold: Scaffold = "code"): string {
  return readFileSync(join(scaffoldDir(packageRoot, scaffold), "AGENTS.block.md"), "utf8").replace("{{MIGRATION}}", migration);
}

// Replaces the managed block but keeps the harness's migration level:
// migrations are applied by upgrade-harness, never implied by a text refresh.
export function refreshBlock(agents: string, freshBlock: string): string {
  const start = agents.indexOf(BLOCK_START);
  const endAt = agents.indexOf(BLOCK_END);
  if (start === -1 || endAt === -1) return agents;
  const current = agents.slice(start, endAt + BLOCK_END.length);
  const level = current.match(MIGRATION_RE)?.[1] ?? "M000";
  const next = freshBlock.trimEnd().replace(MIGRATION_RE, `<!-- loopboard:migration ${level} -->`);
  return agents.slice(0, start) + next + agents.slice(endAt + BLOCK_END.length);
}

interface Shipped {
  path: string;
  content: string;
}

function shippedFiles(opts: InitOptions, installedSkills: Set<string>): Shipped[] {
  const pkg = opts.packageRoot;
  const files: Shipped[] = [];
  const add = (from: string, to: string) => files.push({ path: to, content: readFileSync(from, "utf8") });
  const skills = new Set<string>(CORE_SKILLS);
  for (const s of EXTRA_SKILLS) if (opts.withExtras || installedSkills.has(s)) skills.add(s);
  for (const skill of skills) {
    const dir = join(pkg, ".agents", "skills", skill);
    for (const f of listFiles(dir)) add(f, join(".agents", "skills", skill, relative(dir, f)));
  }
  add(join(pkg, ".agents", "skills", "CREDITS.md"), ".agents/skills/CREDITS.md");
  for (const area of ["issues", "projects"]) {
    add(join(pkg, ".agents", area, "README.md"), `.agents/${area}/README.md`);
    const tpl = join(pkg, ".agents", area, "_templates");
    for (const f of listFiles(tpl)) add(f, join(".agents", area, "_templates", relative(tpl, f)));
  }
  return files.map((f) => ({ ...f, path: f.path.split("\\").join("/") }));
}

function seedFiles(opts: InitOptions): Shipped[] {
  const scaffold = join(opts.packageRoot, "scaffold");
  const seeds: Shipped[] = [];
  for (const area of ["specs", "architecture", "rules", "design"]) {
    const dir = join(scaffold, area);
    for (const f of listFiles(dir)) {
      seeds.push({ path: join(".agents", area, relative(dir, f)).split("\\").join("/"), content: readFileSync(f, "utf8") });
    }
  }
  seeds.push({ path: ".agents/issues/_archive/.gitkeep", content: "" });
  if (!opts.upgrade) seeds.push({ path: ".agents/SETUP.md", content: readFileSync(join(scaffold, "SETUP.md"), "utf8") });
  seeds.push({ path: "CLAUDE.md", content: readFileSync(join(scaffold, "CLAUDE.md"), "utf8") });
  return seeds;
}

// A docs harness gets its own READMEs and templates: the code ones link to
// skills and specs it doesn't have (#0078).
function docsFiles(opts: InitOptions): Shipped[] {
  const files: Shipped[] = [];
  for (const area of ["issues", "projects"]) {
    const dir = join(scaffoldDir(opts.packageRoot, "docs"), area);
    for (const f of listFiles(dir)) {
      files.push({ path: join(".agents", area, relative(dir, f)).split("\\").join("/"), content: readFileSync(f, "utf8") });
    }
  }
  return files;
}

function docsSeeds(opts: InitOptions): Shipped[] {
  return [
    { path: ".agents/issues/_archive/.gitkeep", content: "" },
    { path: "CLAUDE.md", content: readFileSync(join(opts.packageRoot, "scaffold", "CLAUDE.md"), "utf8") },
  ];
}

async function readManifest(repo: string): Promise<Record<string, string>> {
  try {
    return (JSON.parse(await readFile(join(repo, MANIFEST), "utf8")) as { files?: Record<string, string> }).files ?? {};
  } catch {
    return {};
  }
}

function readLocal(repo: string, path: string): string | null {
  try {
    return readFileSync(join(repo, path), "utf8");
  } catch {
    return null;
  }
}

// What the folder holds already. The identity file says it; a harness
// without one is a code harness (ADR-0007).
function existingScaffold(repo: string): Scaffold | null {
  const identity = readIdentity(repo);
  if (identity) return identity.type === "docs" ? "docs" : "code";
  const marks = [MANIFEST, ".agents/specs", ".agents/architecture", ".agents/SETUP.md"];
  if (marks.some((mark) => existsSync(join(repo, mark)))) return "code";
  return readLocal(repo, "AGENTS.md")?.includes(BLOCK_START) ? "code" : null;
}

// `--kind` picks the scaffold for a new harness; an existing one keeps the
// kind it has, with or without the flag (#0078).
function pickScaffold(opts: InitOptions): Scaffold {
  const asked = SCAFFOLDS.find((kind) => kind === opts.kind);
  if (opts.kind !== undefined && !asked) throw new InitError(`--kind takes code or docs, not ${quoted(opts.kind)}.`);
  const existing = existingScaffold(opts.repoPath);
  if (asked && existing && asked !== existing) {
    const found = existing === "docs" ? "a docs harness" : `a code harness (no "type: docs" in ${IDENTITY_FILE})`;
    throw new InitError(`This folder already holds ${found}, and --kind ${asked} would mix the two — nothing was written.`);
  }
  const scaffold = asked ?? existing ?? "code";
  if (scaffold === "code" && [opts.id, opts.name, opts.parent].some((value) => value !== undefined)) {
    throw new InitError("--id, --name and --parent go into the identity file, which init writes with --kind docs only.");
  }
  if (scaffold === "docs" && opts.withExtras) {
    throw new InitError("--with-extras adds skills, and a docs harness has none — leave it out.");
  }
  return scaffold;
}

// Every name a registered workspace answers to: its registry id, and the id
// and aliases of its identity file, which the registry reads from #0079 on.
function namesOf(workspace: Workspace): string[] {
  const identity = readIdentity(workspace.repoPath);
  return [workspace.id, ...(identity?.id ? [identity.id] : []), ...(identity?.aliases ?? [])];
}

// A registered folder keeps its workspace id, any other gets its slug. An id
// that breaks ADR-0008 or is taken stops `init` before anything is written.
async function settleId(opts: InitOptions): Promise<string> {
  const repo = opts.repoPath;
  const registry = opts.configDir ? (await loadRegistry(opts.configDir)).workspaces : [];
  const here = registry.find((w) => sameRoot(resolve(w.repoPath), repo));
  const id = opts.id ?? here?.id ?? slugify(basename(repo));
  if (!id) throw new InitError(`The folder name ${quoted(basename(repo))} leaves no id — pass --id with ${ID_RULE}.`);
  const problem = idProblem(id);
  if (problem && opts.id !== undefined) throw new InitError(`--id ${quoted(id)} ${problem} — an id is ${ID_RULE}.`);
  if (problem) {
    throw new InitError(`${quoted(id)}, this folder's ${here ? "workspace id" : "slug"}, ${problem} — pass --id with ${ID_RULE}.`);
  }
  const owner = registry.find((w) => w !== here && namesOf(w).includes(id));
  if (owner) {
    throw new InitError(`The id ${quoted(id)} already belongs to the workspace at ${printable(owner.repoPath)} — pass --id with another one (${ID_RULE}).`);
  }
  return id;
}

// The identity file (ADR-0007): written once, never overwritten.
async function identityAction(opts: InitOptions): Promise<Action> {
  const repo = opts.repoPath;
  const existing = readIdentity(repo);
  if (existing) {
    for (const key of ["id", "name", "parent"] as const) {
      if (opts[key] === undefined || opts[key] === existing[key]) continue;
      const how = key === "id" ? ", and an id never changes" : "; edit the file to change it";
      throw new InitError(`${IDENTITY_FILE} already has ${key}: ${printable(existing[key] ?? "")} — init never overwrites it${how}.`);
    }
    return { path: IDENTITY_FILE, kind: "keep" };
  }
  if (existsSync(join(repo, IDENTITY_FILE))) throw new InitError(`${IDENTITY_FILE} can't be read — nothing was written.`);
  const id = await settleId(opts);
  const parent = opts.parent ?? null;
  const problem = parent === null ? null : parent === id ? "is this harness's own id" : idProblem(parent);
  if (parent !== null && problem) {
    throw new InitError(`--parent ${quoted(parent)} ${problem} — a parent is another harness's id (${ID_RULE}); leave it out for a top node.`);
  }
  const content = renderIdentity({
    id,
    name: opts.name ?? basename(repo).normalize("NFC"),
    kind: "harness",
    type: "docs",
    parent,
    created: opts.today ?? todayIso(),
  });
  return { path: IDENTITY_FILE, kind: "create", content };
}

export async function planInit(opts: InitOptions): Promise<Action[]> {
  const repo = opts.repoPath;
  // Re-running init on an .agents/ harness only fills gaps; a legacy ai/
  // root needs path-aware merging, which is upgrade-harness's job.
  const existing = detectRoot(repo);
  if (existing && relative(repo, existing.root) !== ".agents") {
    throw new InitError(
      `This repo's harness lives in ${relative(repo, existing.root) || "."}/, not .agents/. Ask your agent to "upgrade my loopboard harness" — the upgrade-harness skill adapts paths and can move the root.`
    );
  }
  const scaffold = pickScaffold(opts);
  const docs = scaffold === "docs";
  const installed = new Set(
    !docs && existsSync(join(repo, ".agents", "skills")) ? readdirSync(join(repo, ".agents", "skills")) : []
  );
  const manifest = opts.upgrade ? await readManifest(repo) : {};
  const actions: Action[] = [];
  if (docs) actions.push(await identityAction(opts));

  for (const file of docs ? docsFiles(opts) : shippedFiles(opts, installed)) {
    const local = readLocal(repo, file.path);
    if (local === null) actions.push({ path: file.path, kind: "create", content: file.content, managed: true });
    else if (local === file.content) actions.push({ path: file.path, kind: "same", managed: true });
    else if (!opts.upgrade) actions.push({ path: file.path, kind: "keep", note: "exists" });
    else if (opts.force || manifest[file.path] === sha(local))
      actions.push({ path: file.path, kind: "update", content: file.content, managed: true });
    else actions.push({ path: file.path, kind: "keep-modified", note: "edited locally" });
  }

  for (const seed of docs ? docsSeeds(opts) : seedFiles(opts)) {
    const local = readLocal(repo, seed.path);
    if (local === null) actions.push({ path: seed.path, kind: "create", content: seed.content });
    else actions.push({ path: seed.path, kind: "keep" });
  }

  // AGENTS.md: create, append the block, or (upgrade) refresh it in place.
  const agentsPath = "AGENTS.md";
  const agents = readLocal(repo, agentsPath);
  const level = opts.upgrade ? "M000" : latestMigration(opts.packageRoot);
  const block = renderBlock(opts.packageRoot, level, scaffold);
  if (agents === null) {
    const skeleton = readFileSync(join(scaffoldDir(opts.packageRoot, scaffold), "AGENTS.md"), "utf8").replace("{{BLOCK}}", block.trimEnd());
    actions.push({ path: agentsPath, kind: "create", content: skeleton });
  } else if (!agents.includes(BLOCK_START)) {
    actions.push({ path: agentsPath, kind: "block", content: `${agents.trimEnd()}\n\n${block}`, note: "appended the workflow block" });
  } else if (opts.upgrade) {
    const next = refreshBlock(agents, block);
    actions.push(next === agents ? { path: agentsPath, kind: "same" } : { path: agentsPath, kind: "block", content: next, note: "refreshed the workflow block" });
  } else {
    actions.push({ path: agentsPath, kind: "keep" });
  }
  // A docs harness has no skills, so nothing to link (#0078).
  if (docs) return actions;

  // Skill links for the agent tools: Claude Code always, Cursor if present.
  const tools = [".claude"];
  if (existsSync(join(repo, ".cursor"))) tools.push(".cursor");
  const skillNames = [...new Set(actions.filter((a) => a.path.startsWith(".agents/skills/") && a.path.split("/").length >= 4).map((a) => a.path.split("/")[2]))];
  for (const tool of tools) {
    for (const skill of skillNames) {
      const link = `${tool}/skills/${skill}`;
      if (existsSync(join(repo, link))) continue;
      actions.push({ path: link, kind: "link", linkTarget: `../../.agents/skills/${skill}` });
    }
  }
  return actions;
}

export async function applyPlan(repo: string, actions: Action[], packageVersion: string): Promise<void> {
  const manifest: Record<string, string> = await readManifest(repo);
  for (const a of actions) {
    const target = join(repo, a.path);
    if (a.content !== undefined && (a.kind === "create" || a.kind === "update" || a.kind === "block")) {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, a.content, "utf8");
    }
    if (a.kind === "link" && a.linkTarget) {
      await mkdir(dirname(target), { recursive: true });
      try {
        symlinkSync(a.linkTarget, target, "dir");
      } catch {
        // Windows without symlink rights: copy instead.
        cpSync(join(dirname(target), a.linkTarget), target, { recursive: true });
      }
    }
    if (a.managed) {
      const local = readLocal(repo, a.path);
      if (local !== null) manifest[a.path] = sha(local);
    }
  }
  await mkdir(dirname(join(repo, MANIFEST)), { recursive: true });
  await writeFile(join(repo, MANIFEST), JSON.stringify({ version: packageVersion, files: manifest }, null, 2) + "\n", "utf8");
}

const LABEL: Record<ActionKind, string> = {
  create: "created",
  update: "updated",
  same: "unchanged",
  keep: "kept",
  "keep-modified": "skipped (edited locally)",
  link: "linked",
  block: "AGENTS.md",
};

// What to do after a first run. The code scaffold has a SETUP.md for it; the
// docs scaffold has none, so a CLAUDE.md from before is named here (#0078).
export function nextStep(repo: string, actions: Action[]): string {
  if (!actions.some((a) => a.path === IDENTITY_FILE)) return "ask your agent to follow .agents/SETUP.md, then run `npx loopboard`.";
  const imported = readLocal(repo, "CLAUDE.md")?.includes("@AGENTS.md");
  return `say what this folder is for in ${IDENTITY_FILE} and AGENTS.md${imported ? "" : ", add the line `@AGENTS.md` to your CLAUDE.md"}, then run \`loopboard\`.`;
}

export function summarizePlan(actions: Action[], dryRun: boolean): string {
  const lines: string[] = [];
  for (const kind of ["create", "update", "block", "link", "keep-modified"] as ActionKind[]) {
    const items = actions.filter((a) => a.kind === kind);
    if (!items.length) continue;
    lines.push(`${dryRun ? "would be " : ""}${LABEL[kind]} (${items.length}):`);
    for (const a of items) lines.push(`  ${a.path}${a.note ? ` — ${a.note}` : ""}`);
  }
  const quiet = actions.filter((a) => a.kind === "same" || a.kind === "keep").length;
  if (quiet) lines.push(`${quiet} file(s) already in place.`);
  return lines.join("\n");
}
