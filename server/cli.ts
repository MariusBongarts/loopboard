import { existsSync } from "node:fs";
import { readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { checkRoot, nextId, type IdKind } from "./ids";
import { applyPlan, InitError, planInit, summarizePlan } from "./init";
import { readBoard } from "./issues";
import { applyRenumber, planRenumber, RenumberError } from "./renumber";
import { openBrowser } from "./open";
import { configDir, packageRoot, packageVersion } from "./paths";
import { createAppServer, listen } from "./serve";
import { detectRoot, registerWorkspace } from "./workspaces";

export type Command = (args: string[]) => Promise<number>;

const HELP = `loopboard ${packageVersion()} — a local board for the issues, PRDs and specs in .agents/

Usage
  loopboard [path]          Open the board for the repo at path (default: here)
    --port <n>              Port to try first (default 5180; next free one if taken)
    --no-open               Don't open the browser

  loopboard --version | --help
`;

// Commands other than "start" register here so later slices add to one table.
export const commands: Record<string, { summary: string; run: Command }> = {};

interface RunningServer {
  port: number;
  pid: number;
}

function serverFile(dir: string): string {
  return join(dir, "server.json");
}

async function findRunningServer(dir: string): Promise<RunningServer | null> {
  try {
    const info = JSON.parse(await readFile(serverFile(dir), "utf8")) as RunningServer;
    const res = await fetch(`http://127.0.0.1:${info.port}/api/health`, { signal: AbortSignal.timeout(800) });
    const body = (await res.json()) as { name?: string };
    return body.name === "loopboard" ? info : null;
  } catch {
    return null;
  }
}

function flag(args: string[], name: string): boolean {
  return args.includes(name);
}

function option(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function positionals(args: string[], withValues: string[] = []): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (withValues.includes(args[i])) i++;
    else if (!args[i].startsWith("-")) out.push(args[i]);
  }
  return out;
}

export interface LaunchOptions {
  target: string;
  port: number;
  configDir: string;
  clientDir: string;
}

export type LaunchResult =
  | { kind: "handed-off"; url: string }
  | { kind: "started"; url: string; workspaceRoot: string; close: () => Promise<void> }
  | { kind: "error"; message: string };

// Starts a server for `target`, or hands the repo to one already running
// (ADR-0002). Exported for tests; `start` adds argument parsing and signals.
export async function launch(opts: LaunchOptions): Promise<LaunchResult> {
  if (!detectRoot(opts.target)) {
    return {
      kind: "error",
      message: `No .agents/ (or legacy ai/) folder with issues/ in ${opts.target}.\nSet the workflow up first:  npx loopboard init`,
    };
  }
  const running = await findRunningServer(opts.configDir);
  if (running) {
    const res = await fetch(`http://127.0.0.1:${running.port}/api/workspaces`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: opts.target }),
    });
    const body = (await res.json()) as { workspace?: { id: string }; error?: string };
    if (!res.ok || !body.workspace) return { kind: "error", message: body.error ?? `could not register ${opts.target}` };
    return { kind: "handed-off", url: `http://127.0.0.1:${running.port}/w/${body.workspace.id}` };
  }
  if (!existsSync(join(opts.clientDir, "index.html"))) {
    return { kind: "error", message: `The client isn't built (${opts.clientDir}). Run \`pnpm build\` first.` };
  }
  const workspace = await registerWorkspace(opts.configDir, opts.target);
  const server = createAppServer({ configDir: opts.configDir, clientDir: opts.clientDir, port: opts.port });
  const bound = await listen(server, opts.port);
  await mkdir(opts.configDir, { recursive: true });
  await writeFile(serverFile(opts.configDir), JSON.stringify({ port: bound, pid: process.pid }) + "\n", "utf8");
  return {
    kind: "started",
    // 127.0.0.1, not localhost: the server binds IPv4 loopback only.
    url: `http://127.0.0.1:${bound}/w/${workspace.id}`,
    workspaceRoot: workspace.root,
    close: async () => {
      await rm(serverFile(opts.configDir), { force: true });
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}

async function start(args: string[]): Promise<number> {
  const result = await launch({
    target: resolve(positionals(args, ["--port"])[0] ?? "."),
    port: Number(option(args, "--port") ?? 5180),
    configDir: configDir(),
    clientDir: join(packageRoot(), "build", "client"),
  });
  const open = !flag(args, "--no-open");
  if (result.kind === "error") {
    console.error(result.message);
    return 1;
  }
  if (result.kind === "handed-off") {
    console.log(`loopboard is already running — opened ${result.url}`);
    if (open) openBrowser(result.url);
    return 0;
  }
  console.log(`loopboard ${packageVersion()} → ${result.url}\n  workspace: ${result.workspaceRoot}\n  Ctrl+C to stop`);
  if (open) openBrowser(result.url);
  const stop = async () => {
    await result.close();
    process.exit(0);
  };
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
  return new Promise<number>(() => {});
}

commands.init = {
  summary: "Set up the workflow in a repo (--with-extras, --upgrade, --force, --dry-run)",
  async run(args) {
    const repoPath = resolve(positionals(args)[0] ?? ".");
    const upgrade = flag(args, "--upgrade");
    const dryRun = flag(args, "--dry-run");
    try {
      const actions = await planInit({
        repoPath,
        packageRoot: packageRoot(),
        withExtras: flag(args, "--with-extras"),
        upgrade,
        force: flag(args, "--force"),
      });
      if (!dryRun) await applyPlan(repoPath, actions, packageVersion());
      console.log(summarizePlan(actions, dryRun));
      if (dryRun) return 0;
      if (actions.every((a) => a.kind === "same" || a.kind === "keep")) {
        console.log("Nothing to do — the workflow is already set up.");
        return 0;
      }
      if (upgrade) {
        if (actions.some((a) => a.kind === "keep-modified")) {
          console.log('\nEdited files were left alone. To merge them and apply workflow migrations, ask your agent: "upgrade my loopboard harness".');
        }
      } else {
        console.log(`\nNext: ask your agent to follow .agents/SETUP.md, then run \`npx loopboard\`.`);
      }
      return 0;
    } catch (err) {
      if (err instanceof InitError) {
        console.error(err.message);
        return 1;
      }
      throw err;
    }
  },
};

function rootFor(path: string | undefined): string | null {
  const target = resolve(path ?? ".");
  const found = detectRoot(target);
  if (!found) console.error(`No .agents/ (or legacy ai/) folder with issues/ in ${target}.`);
  return found?.root ?? null;
}

commands["next-id"] = {
  summary: "Print the next free issue or project number across all branches",
  async run(args) {
    const [kind, path] = positionals(args);
    if (kind !== "issue" && kind !== "project") {
      console.error("Usage: loopboard next-id <issue|project> [path]");
      return 1;
    }
    const root = rootFor(path);
    if (!root) return 1;
    console.log(nextId(root, kind as IdKind));
    return 0;
  },
};

commands.check = {
  summary: "Find duplicate numbers, dangling references and files the board skips (--branches, --strict)",
  async run(args) {
    const root = rootFor(positionals(args)[0]);
    if (!root) return 1;
    const strict = flag(args, "--strict");
    const report = checkRoot(root, flag(args, "--branches"));
    for (const d of report.duplicates) {
      console.log(`✗ duplicate ${d.kind} ${d.id}:`);
      for (const n of d.names) console.log(`    ${n.name}  (${n.where})`);
      const local = d.names.find((n) => n.where === "working tree" && d.names.indexOf(n) > 0) ?? d.names.find((n) => n.where === "working tree");
      if (local) console.log(`  fix: loopboard renumber ${d.id} --file ${local.name}`);
    }
    for (const r of report.dangling) console.log(`${strict ? "✗" : "!"} ${r.file}: ${r.ref} points at no issue`);
    // The board's own list of files it can't show (#0071).
    const { skipped } = await readBoard(root);
    for (const f of skipped) console.log(`${strict ? "✗" : "!"} ${f.file}: skipped — ${f.reason}`);
    const failed = report.duplicates.length > 0 || (strict && report.dangling.length + skipped.length > 0);
    if (!failed) {
      const notes = [
        ...(report.dangling.length ? [`${report.dangling.length} dangling reference warnings`] : []),
        ...(skipped.length ? [`${skipped.length} skipped ${skipped.length === 1 ? "file" : "files"}`] : []),
      ];
      console.log(`✓ no duplicate numbers${notes.length ? ` (${notes.join(", ")})` : ""}`);
    }
    return failed ? 1 : 0;
  },
};

commands.renumber = {
  summary: "Move an issue (NNNN) or project (NN) to a new number, fixing references (--file, --dry-run)",
  async run(args) {
    const [oldId, newId] = positionals(args, ["--file"]);
    const root = rootFor(option(args, "--path"));
    if (!root || !oldId) {
      if (!oldId) console.error("Usage: loopboard renumber <old> [new] [--file <name>] [--dry-run]");
      return 1;
    }
    try {
      const plan = planRenumber({ root, oldId, newId, file: option(args, "--file") });
      const dry = flag(args, "--dry-run");
      console.log(`${dry ? "would move" : "moved"} ${plan.from} → ${plan.to}`);
      for (const e of plan.edits) console.log(`  ${dry ? "would update" : "updated"} ${e.file}`);
      for (const f of plan.ambiguous) console.log(`  ! ${f} mentions #${oldId}, which may mean the other ${oldId} — left as is`);
      if (!dry) applyRenumber(root, plan);
      return 0;
    } catch (err) {
      if (err instanceof RenumberError) {
        console.error(err.message);
        return 1;
      }
      throw err;
    }
  },
};

export async function main(argv: string[]): Promise<number> {
  const [first, ...rest] = argv;
  if (first === "--help" || first === "-h" || first === "help") {
    const extra = Object.entries(commands)
      .map(([name, c]) => `  loopboard ${name.padEnd(22)}${c.summary}`)
      .join("\n");
    console.log(HELP + (extra ? `\nCommands\n${extra}\n` : ""));
    return 0;
  }
  if (first === "--version" || first === "-v") {
    console.log(packageVersion());
    return 0;
  }
  const command = first ? commands[first] : undefined;
  if (command) return command.run(rest);
  return start(argv);
}
