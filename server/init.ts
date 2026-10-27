import { createHash } from "node:crypto";
import { accessSync, constants, cpSync, existsSync, readFileSync, readdirSync, statSync, symlinkSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { printable, quoted } from "../shared/printable";
import { todayIso } from "./files";
import { ID_RULE, IDENTITY_FILE, idProblem, readIdentity, renderIdentity, type IdentityLines } from "./identity";
import { latestMigration, MIGRATION_RE } from "./migrations";
import { matchName } from "./names";
import { detectRoot, loadRegistry, samePath, slugify, workspaceNames } from "./workspaces";

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

function readLocal(repo: string, path: string): string | null {
  try {
    return readFileSync(join(repo, path), "utf8");
  } catch {
    return null;
  }
}

// Hashes of the shipped files as init wrote them, and the scaffold they
// came from (#0078).
interface Manifest {
  scaffold?: string;
  files?: Record<string, string>;
}

function readManifest(repo: string): Manifest {
  try {
    return (JSON.parse(readLocal(repo, MANIFEST) ?? "{}") ?? {}) as Manifest;
  } catch {
    return {};
  }
}

// The scaffold a manifest stands for. One written before the field existed
// is a docs manifest when it lists files and no skill among them.
function manifestScaffold(repo: string): string | undefined {
  const { scaffold, files = {} } = readManifest(repo);
  const paths = Object.keys(files);
  return scaffold ?? (paths.length && !paths.some((path) => path.startsWith(".agents/skills/")) ? "docs" : undefined);
}

// Only a docs plan holds the identity file, until #0103 writes one for code.
export function planScaffold(actions: Action[]): Scaffold {
  return actions.some((a) => a.path === IDENTITY_FILE) ? "docs" : "code";
}

const CODE_MARKS = [".agents/skills", ".agents/specs", ".agents/architecture", ".agents/rules", ".agents/design", ".agents/SETUP.md", MANIFEST];

// What the folder holds already, and what says so. The identity file's
// `type` decides; where the file is gone or names none, the manifest
// remembers the scaffold (#0078). Without either it is a code harness
// (ADR-0007).
function existingHarness(repo: string): { scaffold: Scaffold; by: string } | null {
  const identity = readIdentity(repo);
  const type = identity?.type?.toLowerCase();
  if (type === "code") return { scaffold: "code", by: `"type: code" in ${IDENTITY_FILE}` };
  if (type === "docs" || manifestScaffold(repo) === "docs") return { scaffold: "docs", by: "" };
  if (identity) return { scaffold: "code", by: `no "type: docs" in ${IDENTITY_FILE}` };
  const mark = CODE_MARKS.find((path) => existsSync(join(repo, path)));
  if (mark) return { scaffold: "code", by: `it has ${mark}` };
  const block = readLocal(repo, "AGENTS.md")?.includes(BLOCK_START);
  return block ? { scaffold: "code", by: "AGENTS.md has the loopboard block, and no identity file says otherwise" } : null;
}

// A folder of documents may have an `issues/` of its own — a magazine's back
// issues. For `--kind docs` that is a harness only with an issue file in it.
function issueRoot(opts: InitOptions): string | null {
  const found = detectRoot(opts.repoPath);
  if (!found) return null;
  if (found.root !== found.repoPath || opts.kind !== "docs") return found.root;
  try {
    return readdirSync(join(found.root, "issues")).some((file) => matchName("issue", file)?.valid) ? found.root : null;
  } catch {
    return found.root;
  }
}

// Nothing here yet: `--upgrade` is then a first run like any other (#0078).
export function isNewHarness(opts: InitOptions): boolean {
  return !issueRoot(opts) && !existingHarness(opts.repoPath);
}

// `--kind` picks the scaffold for a new harness; an existing one keeps the
// kind it has, with or without the flag (#0078).
function pickScaffold(opts: InitOptions): Scaffold {
  const repo = opts.repoPath;
  const identity = readIdentity(repo);
  if (!identity && existsSync(join(repo, IDENTITY_FILE))) throw new InitError(`${IDENTITY_FILE} can't be read — nothing was written.`);
  if (identity?.kind === "index") {
    throw new InitError(`${IDENTITY_FILE} says "kind: index", and init can't set up an index node yet — nothing was written.`);
  }
  const asked = SCAFFOLDS.find((kind) => kind === opts.kind);
  if (opts.kind !== undefined && !asked) {
    throw new InitError(`--kind takes code or docs, not ${quoted(opts.kind)}${opts.kind === "index" ? " — index nodes aren't built yet" : ""}.`);
  }
  const existing = existingHarness(repo);
  if (asked && existing && asked !== existing.scaffold) {
    const found = existing.scaffold === "docs" ? "a docs harness" : `a code harness (${existing.by})`;
    throw new InitError(`This folder already holds ${found}, and --kind ${asked} would mix the two — nothing was written.`);
  }
  const scaffold = asked ?? existing?.scaffold ?? "code";
  if (scaffold === "code" && [opts.id, opts.name, opts.parent].some((value) => value !== undefined)) {
    throw new InitError("--id, --name and --parent go into the identity file, which init writes with --kind docs only.");
  }
  if (scaffold === "docs" && opts.withExtras) {
    throw new InitError("--with-extras adds skills, and a docs harness has none — leave it out.");
  }
  return scaffold;
}

// A registered folder keeps its workspace id, any other gets its slug. An id
// that breaks ADR-0008 or is taken stops `init` before anything is written.
async function settleId(opts: InitOptions): Promise<string> {
  const repo = opts.repoPath;
  const registry = opts.configDir ? (await loadRegistry(opts.configDir)).workspaces : [];
  // By the folder, not the spelling: a registered path may lead through a symlink.
  const mine = registry.filter((w) => samePath(resolve(w.repoPath), repo));
  const here = mine.at(0);
  const slug = slugify(basename(repo));
  const id = opts.id ?? here?.id ?? slug;
  if (!id) throw new InitError(`The folder name ${quoted(basename(repo))} leaves no id — pass --id with ${ID_RULE}.`);
  // `workspace-2` stands in for a name without a slug as `workspace` does.
  const problem = idProblem(id) ?? (opts.id === undefined && !slug ? "stands in for a folder name that leaves no id" : null);
  if (problem && opts.id !== undefined) throw new InitError(`--id ${quoted(id)} ${problem} — an id is ${ID_RULE}.`);
  if (problem) {
    throw new InitError(`${quoted(id)}, this folder's ${here ? "workspace id" : "slug"}, ${problem} — pass --id with ${ID_RULE}.`);
  }
  const owner = registry.find((w) => !mine.includes(w) && workspaceNames(w).includes(id));
  if (owner) {
    throw new InitError(`The id ${quoted(id)} already belongs to the workspace at ${printable(owner.repoPath)} — pass --id with another one (${ID_RULE}).`);
  }
  return id;
}

// An identity file from before is checked, never repaired: `init` doesn't
// write into it, so it says what is wrong with the id or the parent.
function checkIdentity(existing: IdentityLines): void {
  const id = existing.id ?? "";
  const wrong = id === "" ? "has no id" : idProblem(id) && `has the id ${quoted(id)}, which ${idProblem(id)}`;
  if (wrong) throw new InitError(`${IDENTITY_FILE} ${wrong} — an id is ${ID_RULE}; edit the file.`);
  const parent = ["", "null", "~"].includes(existing.parent ?? "") ? null : (existing.parent ?? null);
  const problem = parent === null ? null : parent === id ? "is this harness's own id" : idProblem(parent);
  if (parent !== null && problem) {
    throw new InitError(`${IDENTITY_FILE} has the parent ${quoted(parent)}, which ${problem} — a parent is another harness's id or null; edit the file.`);
  }
}

// The identity file (ADR-0007): written once, never overwritten.
async function identityAction(opts: InitOptions): Promise<Action> {
  const repo = opts.repoPath;
  const existing = readIdentity(repo);
  if (existing) {
    checkIdentity(existing);
    for (const key of ["id", "name", "parent"] as const) {
      if (opts[key] === undefined || opts[key] === existing[key]) continue;
      const how = key === "id" ? ", and an id never changes" : "; edit the file to change it";
      throw new InitError(`${IDENTITY_FILE} already has ${key}: ${printable(existing[key] ?? "")} — init never overwrites it${how}.`);
    }
    return { path: IDENTITY_FILE, kind: "keep" };
  }
  // A docs harness that lost the file gets it back only when asked by name:
  // the id it had may be another than the one settled here.
  if (opts.kind !== "docs") {
    throw new InitError(
      `This docs harness has lost ${IDENTITY_FILE} — run \`loopboard init --kind docs\` to write it again, with --id if its id was not the folder's; nothing was written.`
    );
  }
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

export async function planInit(asked: InitOptions): Promise<Action[]> {
  const opts = { ...asked, upgrade: !!asked.upgrade && !isNewHarness(asked) };
  const repo = opts.repoPath;
  // Re-running init on an .agents/ harness only fills gaps; a legacy ai/
  // root needs path-aware merging, which is upgrade-harness's job.
  const root = issueRoot(opts);
  if (root && relative(repo, root) !== ".agents") {
    throw new InitError(
      `This repo's harness lives in ${relative(repo, root) || "."}/, not .agents/. Ask your agent to "upgrade my loopboard harness" — the upgrade-harness skill adapts paths and can move the root.`
    );
  }
  const scaffold = pickScaffold(opts);
  const docs = scaffold === "docs";
  const installed = new Set(
    !docs && existsSync(join(repo, ".agents", "skills")) ? readdirSync(join(repo, ".agents", "skills")) : []
  );
  const manifest = opts.upgrade ? (readManifest(repo).files ?? {}) : {};
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

// Why the plan can't write `path`; null when it can. Every target is asked
// before the first write, so a plan is applied whole or not at all (#0078).
function writeProblem(repo: string, path: string): string | null {
  const target = join(repo, path);
  let at = target;
  while (!existsSync(at) && dirname(at) !== at) at = dirname(at);
  const name = relative(repo, at).split("\\").join("/");
  const where = name === "" ? "This folder" : name.startsWith("..") ? printable(at) : name;
  try {
    const folder = statSync(at).isDirectory();
    if (folder === (at === target)) return `${where} is a ${folder ? "folder" : "file"} where init writes a ${folder ? "file" : "folder"}`;
    accessSync(at, folder ? constants.W_OK | constants.X_OK : constants.W_OK);
    return null;
  } catch {
    return `${where} can't be written to`;
  }
}

export async function applyPlan(repo: string, actions: Action[], packageVersion: string): Promise<void> {
  const writes = actions.filter((a) => (a.content !== undefined && ["create", "update", "block"].includes(a.kind)) || a.kind === "link");
  for (const path of [...writes.map((a) => a.path), MANIFEST]) {
    const problem = writeProblem(repo, path);
    if (problem) throw new InitError(`${problem} — nothing was written.`);
  }
  try {
    await writePlan(repo, actions, packageVersion);
  } catch (err) {
    // What the check can't foresee — a full disk, a file locked meanwhile.
    if (!(err instanceof Error && "path" in err && typeof err.path === "string")) throw err;
    const at = relative(repo, err.path).split("\\").join("/");
    const code = "code" in err ? ` (${String(err.code)})` : "";
    throw new InitError(`init stopped at ${printable(at)}${code} with some files written — fix that and run it again: it only fills the gaps.`);
  }
}

async function writePlan(repo: string, actions: Action[], packageVersion: string): Promise<void> {
  const manifest: Record<string, string> = readManifest(repo).files ?? {};
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
  const record = { version: packageVersion, scaffold: planScaffold(actions), files: manifest };
  await writeFile(join(repo, MANIFEST), JSON.stringify(record, null, 2) + "\n", "utf8");
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
  if (planScaffold(actions) === "code") return "ask your agent to follow .agents/SETUP.md, then run `npx loopboard`.";
  // A CLAUDE.md that is a link to AGENTS.md has nothing to import.
  const imported = readLocal(repo, "CLAUDE.md")?.includes("@AGENTS.md") || samePath(join(repo, "CLAUDE.md"), join(repo, "AGENTS.md"));
  return `say what this folder is for in ${IDENTITY_FILE} and AGENTS.md${imported ? "" : ", add the line `@AGENTS.md` to your CLAUDE.md"}, then run \`loopboard\` — opening the folder is what keeps its id from going to another one.`;
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
