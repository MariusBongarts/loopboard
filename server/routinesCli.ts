import { existsSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { formatWhen, systemTimeZone } from "../shared/cron";
import { printable, shellWord } from "../shared/printable";
import type { Args, Flags } from "./args";
import { FINISH_STATUSES, finishRun, listRoutines, RoutineRefusal, startRun, type FinishStatus, type HarnessRoutines, type RoutineSummary } from "./dispatch";
import { harnessesUnder, harnessFor, machineName, ROUTINE_FILE, SCHEDULED_DIR, type Harness } from "./routines";
import { detectRoot } from "./workspaces";

// `loopboard routines …` (#0114, #0116, ADR-0010). One command with
// subcommands; each takes only its own flags.

const SUBCOMMANDS: Record<string, { usage: string; does: string; flags: string[] }> = {
  list: { usage: "routines [list] [path]", does: "schedule in words, next slot, last run (--under <dir>, --json)", flags: ["--under", "--json"] },
  start: { usage: "routines start <routine>", does: "record the start of a run (--path <repo>, --json, --dry-run)", flags: ["--path", "--json", "--dry-run"] },
  finish: {
    usage: "routines finish <routine> --status ok|failed --note <text|->",
    does: "record how the run ended (--path <repo>, --dry-run)",
    flags: ["--path", "--status", "--note", "--dry-run"],
  },
};

export const ROUTINES_FLAGS: Flags = {
  "--under": "value",
  "--json": "switch",
  "--path": "value",
  "--dry-run": "switch",
  "--status": "value",
  "--note": "value",
};

export const ROUTINES_USAGE = `routines [${Object.keys(SUBCOMMANDS).join("|")}]`;
export const ROUTINES_SUMMARY = [
  "Routines in .agents/scheduled/; <routine> is a routine folder, or its slug in the harness at --path",
  ...Object.values(SUBCOMMANDS).map((s) => `  ${s.usage.padEnd(62)}${s.does}`),
].join("\n      ");

class RoutinesUsage extends Error {}

function given(args: Args): string[] {
  return [...args.switches, ...Object.keys(args.values)];
}

// The harnesses a command covers: `--under <dir>`, else the one at [path].
function scope(args: Args, path: string | undefined): Harness[] {
  const under = args.values["--under"];
  if (under !== undefined) {
    if (path !== undefined) throw new RoutinesUsage("Name either a harness or --under <dir>, not both.");
    return harnessesUnder(resolve(under));
  }
  const target = resolve(path ?? ".");
  const found = detectRoot(target);
  if (!found) throw new RoutinesUsage(`No .agents/ (or legacy ai/) folder with issues/ in ${target}.`);
  return [harnessFor(found.repoPath, found.root)];
}

// A routine folder (or its routine.md), or a slug in the harness at --path.
function routineDir(arg: string | undefined, path: string | undefined): string {
  if (!arg) throw new RoutinesUsage("Name the routine: its folder, or its slug with --path <repo>.");
  const asPath = resolve(arg);
  if (/[\\/]/.test(arg) || arg === "." || (existsSync(asPath) && statSync(asPath).isDirectory())) {
    const dir = basename(asPath) === ROUTINE_FILE ? dirname(asPath) : asPath;
    if (basename(dirname(dir)) !== SCHEDULED_DIR || !existsSync(dir)) throw new RoutinesUsage(`${printable(dir)} is no routine folder (<root>/${SCHEDULED_DIR}/<slug>/).`);
    return dir;
  }
  const target = resolve(path ?? ".");
  const found = detectRoot(target);
  if (!found) throw new RoutinesUsage(`No .agents/ (or legacy ai/) folder with issues/ in ${target}.`);
  const dir = join(found.root, SCHEDULED_DIR, arg);
  if (!existsSync(dir)) throw new RoutinesUsage(`No routine "${printable(arg)}" in ${printable(join(found.root, SCHEDULED_DIR))}/.`);
  return dir;
}

function table(rows: string[][], indent = ""): string[] {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)) + 2);
  return rows.map((r) => indent + r.map((cell, i) => cell.padEnd(widths[i])).join("").trimEnd());
}

function when(iso: string, zone: string, now: number): string {
  return formatWhen(Date.parse(iso), zone, now);
}

function nextCell(r: RoutineSummary, now: number): string {
  if (r.state === "invalid" || r.state === "paused") return r.state;
  if (r.state === "pinned") return `on ${r.host} only`;
  if (r.state === "running" && r.lastRun) return `running since ${when(r.lastRun.at, r.timezone, now)}`;
  if (r.state === "due" && r.slot) return `due since ${when(r.slot, r.timezone, now)}`;
  return r.next ? when(r.next, r.timezone, now) : "—";
}

function lastCell(r: RoutineSummary, now: number): string {
  return r.lastRun && r.lastRun.status !== "running" ? `${r.lastRun.status} · ${when(r.lastRun.at, r.timezone, now)}` : "—";
}

function printHarness(h: HarnessRoutines, now: number, indent: string): void {
  if (!h.routines.length) {
    console.log(`${indent}No routines in ${printable(relative(h.path, `${h.root}/${SCHEDULED_DIR}`))}/.`);
    return;
  }
  const zone = systemTimeZone();
  const rows = [["ROUTINE", "SCHEDULE", "NEXT", "LAST RUN"]];
  const notes = new Map<number, string[]>();
  for (const r of h.routines) {
    const words = r.timezone === zone || r.state === "invalid" ? r.words : `${r.words} · ${r.timezone}`;
    rows.push([printable(r.slug), r.state === "invalid" ? "—" : words, nextCell(r, now), lastCell(r, now)]);
    if (r.problems.length) notes.set(rows.length - 1, r.problems.map((p) => `${p.level === "error" ? "✗" : "!"} ${p.file}: ${printable(p.message)}`));
  }
  table(rows, indent).forEach((line, i) => {
    console.log(line);
    for (const note of notes.get(i) ?? []) console.log(`${indent}    ${note}`);
  });
}

async function list(args: Args): Promise<number> {
  const now = Date.now();
  const under = args.values["--under"] !== undefined;
  const listed = listRoutines(scope(args, args.positionals[1]), now);
  if (args.switches.has("--json")) {
    console.log(JSON.stringify(listed, null, 2));
    return 0;
  }
  if (under && !listed.harnesses.length) console.log(`No harness under ${resolve(args.values["--under"])}.`);
  for (const h of listed.harnesses) {
    if (under) console.log(`${printable(h.name)} · ${printable(h.path)}`);
    printHarness(h, now, under ? "  " : "");
    if (under) console.log("");
  }
  if (!listed.harnesses.some((h) => h.routines.length) && !under) {
    console.log('Ask your agent to "create a routine that …" — routines live in .agents/scheduled/.');
  }
  console.log(`This machine: ${machineName()}`);
  return 0;
}

export function finishCommand(dir: string, status: string): string {
  return `loopboard routines finish ${shellWord(dir)} --status ${status} --note "…"`;
}

async function start(args: Args): Promise<number> {
  const dir = routineDir(args.positionals[1], args.values["--path"]);
  const dryRun = args.switches.has("--dry-run");
  const started = await startRun(dir, Date.now(), { dryRun });
  if (args.switches.has("--json")) {
    console.log(JSON.stringify({ version: 1, action: started.kind, dryRun, dir, ...started }, null, 2));
    return 0;
  }
  const slug = printable(basename(dir));
  if (started.aborted) console.log(`${dryRun ? "would record" : "recorded"} the run started ${started.aborted.at} as aborted: it outlived its timeout`);
  const slot = started.run.slot ? ` — slot ${started.run.slot}` : " — a manual run";
  const missed = started.missed ? ` (${started.missed} earlier ${started.missed === 1 ? "slot" : "slots"} recorded as missed)` : "";
  if (started.kind === "filed") {
    // No agent: the run is the filing, recorded as ok or failed (#0118).
    const issue = started.issue;
    if (!issue) console.error(`${slug}: ${started.run.note}`);
    else if (issue.existing) console.log(`${slug}${slot}: ${started.run.note}${missed}`);
    else console.log(`${dryRun ? "would file" : "filed"} #${issue.id} ${printable(issue.title)}${issue.file ? ` (${issue.file})` : ""} for ${slug}${slot}${missed}`);
    return issue ? 0 : 1;
  }
  console.log(`${dryRun ? "would start" : "started"} ${slug}${slot}${missed}`);
  console.log(`  brief:  loopboard routines prompt ${shellWord(dir)}`);
  console.log(`  finish: ${finishCommand(dir, "ok")}`);
  return 0;
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) throw new RoutinesUsage("--note - reads the note from stdin; pipe it in.");
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function finish(args: Args): Promise<number> {
  const dir = routineDir(args.positionals[1], args.values["--path"]);
  const status = args.values["--status"] ?? "";
  if (!(FINISH_STATUSES as readonly string[]).includes(status)) throw new RoutinesUsage("--status is ok or failed.");
  const noteArg = args.values["--note"];
  if (noteArg === undefined) throw new RoutinesUsage('--note "…" says what the run did, what stands out and what the next run should know.');
  const note = noteArg === "-" ? await readStdin() : noteArg;
  const dryRun = args.switches.has("--dry-run");
  const done = await finishRun(dir, status as FinishStatus, note, Date.now(), { dryRun });
  console.log(`${dryRun ? "would finish" : "finished"} ${printable(basename(dir))}: ${status}`);
  if (done.switchedOff) console.log(`${dryRun ? "would switch" : "switched"} it off: a one-time routine runs once (enabled: false)`);
  return 0;
}

const RUN: Record<string, (args: Args) => Promise<number>> = { list, start, finish };

export async function runRoutines(args: Args): Promise<number> {
  const [first] = args.positionals;
  // `routines [path]` is `routines list [path]`.
  const sub = first !== undefined && Object.hasOwn(SUBCOMMANDS, first) ? first : "list";
  const effective = sub === "list" && first !== "list" ? { ...args, positionals: ["list", ...args.positionals] } : args;
  const spec = SUBCOMMANDS[sub];
  try {
    const stray = given(effective).filter((flag) => !spec.flags.includes(flag));
    if (stray.length) throw new RoutinesUsage(`Unknown flag ${stray[0]}: \`loopboard routines ${sub}\` takes ${spec.flags.join(", ") || "no flags"}.`);
    if (effective.positionals.length > 2) throw new RoutinesUsage(`Usage: loopboard ${spec.usage}`);
    return await RUN[sub](effective);
  } catch (err) {
    if (err instanceof RoutinesUsage || err instanceof RoutineRefusal) {
      console.error(err.message);
      return 1;
    }
    throw err;
  }
}
