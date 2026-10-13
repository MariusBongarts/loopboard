import { existsSync } from "node:fs";
import { readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { escapeControls, printable } from "../shared/printable";
import { parseArgs, UsageError, type Args, type Flags } from "./args";
import { checkRoot, nextId, type IdKind } from "./ids";
import { applyPlan, InitError, nextStep, planInit, summarizePlan } from "./init";
import { readBoard } from "./issues";
import { matchName } from "./names";
import { applyRenumber, planRenumber, RenumberError } from "./renumber";
import { openBrowser } from "./open";
import { configDir, packageRoot, packageVersion } from "./paths";
import { createAppServer, listen } from "./serve";
import { viewsFile } from "./views";
import { detectRoot, loadRegistry, registerWorkspace, removeWorkspaces, summarize } from "./workspaces";

export type Command = (args: Args) => Promise<number>;

const HELP = `loopboard ${packageVersion()} — a local board for the issues, PRDs and specs in .agents/

Usage
  loopboard [path]          Open the board for the repo at path (default: here)
    --port <n>              Port to try first (default 5180; next free one if taken)
    --no-open               Don't open the browser

  loopboard --version | --help
`;

// Printed below the command list (#0076).
const HELP_NOTES = `
Every command runs from any folder: name the repo with [path], or with --path
for renumber. A flag a command doesn't know stops it with exit code 1 before
anything is written.

From a clone, \`pnpm build && npm link\` puts loopboard on the PATH. It runs the
clone's build/, so build again after pulling. \`npx loopboard\` needs the
published package.
`;

// Commands other than "start" register here so later slices add to one table.
// `usage` follows "loopboard " in --help; `flags` is every flag the command
// takes, and whether it has a value (#0076).
export const commands: Record<string, { usage: string; summary: string; flags: Flags; run: Command }> = {};

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

const BOARD_FLAGS: Flags = { "--port": "value", "--no-open": "switch" };

// `loopboard [path]` as launch options. The path resolves against the working
// directory, so the board opens from any folder (#0076). Exported for tests.
export function launchOptions(argv: string[]): LaunchOptions & { open: boolean } {
  const args = parseArgs(argv, BOARD_FLAGS, "loopboard [path]");
  const port = Number(args.values["--port"] ?? 5180);
  // Refused here, before the repo is registered (#0076).
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new UsageError(`--port needs a number from 0 to 65535, not ${printable(args.values["--port"] ?? "")}.`);
  }
  return {
    target: resolve(args.positionals[0] ?? "."),
    port,
    configDir: configDir(),
    clientDir: join(packageRoot(), "build", "client"),
    open: !args.switches.has("--no-open"),
  };
}

async function start(argv: string[]): Promise<number> {
  const { open, ...options } = launchOptions(argv);
  const result = await launch(options);
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
  usage: "init [path]",
  summary: "Set up the workflow in a repo (--with-extras, --upgrade, --force, --dry-run), or with --kind docs in a folder without code (--id, --name, --parent)",
  flags: {
    "--with-extras": "switch",
    "--upgrade": "switch",
    "--force": "switch",
    "--dry-run": "switch",
    "--kind": "value",
    "--id": "value",
    "--name": "value",
    "--parent": "value",
  },
  async run({ positionals, switches, values }) {
    const repoPath = resolve(positionals[0] ?? ".");
    const upgrade = switches.has("--upgrade");
    const dryRun = switches.has("--dry-run");
    try {
      const actions = await planInit({
        repoPath,
        packageRoot: packageRoot(),
        withExtras: switches.has("--with-extras"),
        upgrade,
        force: switches.has("--force"),
        kind: values["--kind"],
        id: values["--id"],
        name: values["--name"],
        parent: values["--parent"],
        configDir: configDir(),
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
        console.log(`\nNext: ${nextStep(repoPath, actions)}`);
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
  usage: "next-id <issue|project> [path]",
  summary: "Print the next free issue or project number across all branches",
  flags: {},
  async run({ positionals }) {
    const [kind, path] = positionals;
    if (kind !== "issue" && kind !== "project") {
      console.error(`Usage: loopboard ${commands["next-id"].usage}`);
      return 1;
    }
    const root = rootFor(path);
    if (!root) return 1;
    console.log(nextId(root, kind as IdKind));
    return 0;
  },
};

// The command that moves one of several files sharing a number, with the
// name as one shell word. A name with control characters can't be typed.
function renumberHint(id: string, name: string): string {
  if (printable(name) !== name) return "rename it by hand — its name holds control characters";
  const word = /^[\w.@%+=:,/-]+$/.test(name) ? name : `'${name.replaceAll("'", `'\\''`)}'`;
  return `loopboard renumber ${id} --file ${word}`;
}

commands.check = {
  usage: "check [path]",
  summary: "Find duplicate numbers, dangling references and files the board skips (--branches, --strict)",
  flags: { "--branches": "switch", "--strict": "switch" },
  async run({ positionals, switches }) {
    const root = rootFor(positionals[0]);
    if (!root) return 1;
    const strict = switches.has("--strict");
    const report = checkRoot(root, switches.has("--branches"));
    for (const d of report.duplicates) {
      console.log(`✗ duplicate ${d.kind} ${d.id}:`);
      for (const n of d.names) console.log(`    ${printable(n.name)}  (${printable(n.where)})`);
      // Move the file the board skips rather than the one it shows (#0071).
      const local = d.names.filter((n) => n.where === "working tree");
      const pick = local.find((n) => !matchName(d.kind, n.name)?.valid) ?? local.find((n) => d.names.indexOf(n) > 0) ?? local[0];
      if (pick) console.log(`  fix: ${renumberHint(d.id, pick.name)}`);
    }
    for (const r of report.dangling) console.log(`${strict ? "✗" : "!"} ${printable(r.file)}: ${r.ref} points at no issue`);
    // The board's own list of files it can't show (#0071).
    const { skipped } = await readBoard(root);
    for (const f of skipped) console.log(`${strict ? "✗" : "!"} ${printable(f.file)}: skipped — ${escapeControls(f.reason)}`);
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
  usage: "renumber <old> [new]",
  summary: "Move an issue (NNNN) or project (NN) to a new number, fixing references (--path <repo>, --file <name>, --dry-run)",
  flags: { "--path": "value", "--file": "value", "--dry-run": "switch" },
  async run({ positionals, switches, values }) {
    const [oldId, newId] = positionals;
    const root = rootFor(values["--path"]);
    if (!root || !oldId) {
      if (!oldId) console.error(`Usage: loopboard ${commands.renumber.usage} [--path <repo>] [--file <name>] [--dry-run]`);
      return 1;
    }
    try {
      const plan = planRenumber({ root, oldId, newId, file: values["--file"] });
      const dry = switches.has("--dry-run");
      console.log(`${dry ? "would move" : "moved"} ${printable(plan.from)} → ${printable(plan.to)}`);
      for (const e of plan.edits) console.log(`  ${dry ? "would update" : "updated"} ${printable(e.file)}`);
      for (const f of plan.ambiguous) console.log(`  ! ${printable(f)} mentions #${oldId}, which may mean the other ${oldId} — left as is`);
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

// The registry without a running board (#0099). The path is the root, as in
// "Manage workspaces": a moved root and its new twin share one repo path.
commands.workspaces = {
  usage: "workspaces",
  summary: "List registered workspaces (--json); `workspaces forget <id>…` removes entries, never files",
  flags: { "--json": "switch" },
  async run({ positionals, switches }) {
    const [sub, ...ids] = positionals;
    const dir = configDir();
    if (sub === "forget" && ids.length) {
      const { removed, unknown } = await removeWorkspaces(dir, ids);
      if (unknown.length) {
        console.error(`unknown workspace: ${unknown.join(", ")} — nothing was forgotten. \`loopboard workspaces\` lists the ids.`);
        return 1;
      }
      for (const w of removed) {
        console.log(`forgot ${w.id}  (${w.root})`);
        if (existsSync(viewsFile(dir, w.id))) console.log(`  its saved views stay in ${viewsFile(dir, w.id)}`);
      }
      console.log("Only the registry changed — no file in a harness was touched.");
      return 0;
    }
    if (sub !== undefined) {
      console.error("Usage: loopboard workspaces [--json] | loopboard workspaces forget <id>…");
      return 1;
    }
    const entries = (await loadRegistry(dir)).workspaces
      .map(summarize)
      .map((w) => ({ id: w.id, name: w.name, path: w.root, exists: w.available }));
    if (switches.has("--json")) console.log(JSON.stringify(entries, null, 2));
    else if (!entries.length) console.log("No workspaces registered. `loopboard [path]` opens a repo and registers it.");
    else {
      const rows = [["ID", "NAME", "FOLDER", "PATH"], ...entries.map((e) => [e.id, e.name, e.exists ? "exists" : "missing", e.path])];
      const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)) + 2);
      for (const r of rows) console.log(r.map((cell, i) => cell.padEnd(widths[i])).join("").trimEnd());
    }
    return 0;
  },
};

export async function main(argv: string[]): Promise<number> {
  const [first, ...rest] = argv;
  if (first === "help" || argv.includes("--help") || argv.includes("-h")) {
    const extra = Object.values(commands)
      .map((c) => `  loopboard ${c.usage}\n      ${c.summary}`)
      .join("\n");
    console.log(HELP + (extra ? `\nCommands\n${extra}\n` : "") + HELP_NOTES);
    return 0;
  }
  if (first === "--version" || first === "-v") {
    console.log(packageVersion());
    return 0;
  }
  // Own entries only: `toString` is a path, not a command.
  const command = first && Object.hasOwn(commands, first) ? commands[first] : undefined;
  try {
    if (command) return await command.run(parseArgs(rest, command.flags, `loopboard ${first}`));
    return await start(argv);
  } catch (err) {
    // An unknown flag stops the command before it writes anything (#0076).
    if (err instanceof UsageError) {
      console.error(err.message);
      return 1;
    }
    throw err;
  }
}
