import { relative, resolve } from "node:path";
import { formatWhen, systemTimeZone } from "../shared/cron";
import { printable } from "../shared/printable";
import type { Args, Flags } from "./args";
import { harnessesUnder, harnessFor, listRoutines, machineName, SCHEDULED_DIR, type HarnessRoutines, type RoutineSummary } from "./routines";
import { detectRoot } from "./workspaces";

// `loopboard routines …` (#0114, ADR-0010). One command with subcommands;
// each subcommand takes only its own flags.

const SUBCOMMANDS: Record<string, { usage: string; flags: string[] }> = {
  list: { usage: "routines [list] [path] [--under <dir>] [--json]", flags: ["--under", "--json"] },
};

export const ROUTINES_FLAGS: Flags = { "--under": "value", "--json": "switch" };

export const ROUTINES_USAGE = "routines [list] [path]";
export const ROUTINES_SUMMARY = "Show the harness's routines with their schedule, next slot and last run (--under <dir>, --json)";

class RoutinesUsage extends Error {}

function given(args: Args): string[] {
  return [...args.switches, ...Object.keys(args.values)];
}

// The harnesses a command covers: `--under <dir>`, else the one at [path].
function scope(args: Args, path: string | undefined): HarnessRoutines[] | null {
  const now = Date.now();
  const under = args.values["--under"];
  if (under !== undefined) {
    if (path !== undefined) throw new RoutinesUsage("Name either a harness or --under <dir>, not both.");
    return listRoutines(harnessesUnder(resolve(under)), now).harnesses;
  }
  const target = resolve(path ?? ".");
  const found = detectRoot(target);
  if (!found) {
    console.error(`No .agents/ (or legacy ai/) folder with issues/ in ${target}.`);
    return null;
  }
  return listRoutines([harnessFor(found.repoPath, found.root)], now).harnesses;
}

function table(rows: string[][], indent = ""): string[] {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)) + 2);
  return rows.map((r) => indent + r.map((cell, i) => cell.padEnd(widths[i])).join("").trimEnd());
}

function nextCell(r: RoutineSummary, now: number): string {
  if (r.state === "invalid") return "invalid";
  if (r.state === "paused") return "paused";
  if (r.state === "running" && r.lastRun) return `running since ${formatWhen(Date.parse(r.lastRun.at), r.timezone, now)}`;
  return r.next ? formatWhen(Date.parse(r.next), r.timezone, now) : "—";
}

function lastCell(r: RoutineSummary, now: number): string {
  return r.lastRun && r.lastRun.status !== "running" ? `${r.lastRun.status} · ${formatWhen(Date.parse(r.lastRun.at), r.timezone, now)}` : "—";
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
  const harnesses = scope(args, args.positionals[1]);
  if (!harnesses) return 1;
  const now = Date.now();
  if (args.switches.has("--json")) {
    console.log(JSON.stringify(listRoutines(harnesses, now), null, 2));
    return 0;
  }
  const under = args.values["--under"] !== undefined;
  if (under && !harnesses.length) console.log(`No harness under ${resolve(args.values["--under"])}.`);
  for (const h of harnesses) {
    if (under) console.log(`${printable(h.name)} · ${printable(h.path)}`);
    printHarness(h, now, under ? "  " : "");
    if (under) console.log("");
  }
  if (!harnesses.some((h) => h.routines.length) && !under) {
    console.log('Ask your agent to "create a routine that …" — routines live in .agents/scheduled/.');
  }
  console.log(`This machine: ${machineName()}`);
  return 0;
}

export async function runRoutines(args: Args): Promise<number> {
  const [first] = args.positionals;
  // `routines [path]` is `routines list [path]`.
  const sub = first !== undefined && Object.hasOwn(SUBCOMMANDS, first) ? first : "list";
  const effective = sub === "list" && first !== "list" ? { ...args, positionals: ["list", ...args.positionals] } : args;
  const spec = SUBCOMMANDS[sub];
  const stray = given(effective).filter((flag) => !spec.flags.includes(flag));
  try {
    if (stray.length) {
      throw new RoutinesUsage(`Unknown flag ${stray[0]}: \`loopboard routines ${sub}\` takes ${spec.flags.join(", ") || "no flags"}.`);
    }
    if (sub === "list") {
      if (effective.positionals.length > 2) throw new RoutinesUsage(`Usage: loopboard ${spec.usage}`);
      return await list(effective);
    }
    return 1;
  } catch (err) {
    if (err instanceof RoutinesUsage) {
      console.error(err.message);
      return 1;
    }
    throw err;
  }
}
