import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { localDay } from "../shared/cron";
import {
  blockEnd,
  changedBlock,
  DECISIONS_HEADING,
  headingLines,
  normalizeChoice,
  parseRunLog,
  routineOf,
  type Decision,
  type DecisionChange,
  type LoggedDecision,
} from "../shared/decisions";
import { withFileLock, writeFileAtomic } from "./files";
import { readRoutine, routineDirs, RUNS_FILE, SCHEDULED_DIR, type Harness } from "./routines";
import { readLogs, routineDecisions } from "./runLog";

// Open decisions across a harness, and `routines answer` (#0136): the
// maintainer's answer goes into the routine's newest run-log section.

export interface HarnessDecision extends LoggedDecision {
  routine: string;
  title: string;
  dir: string;
}

export interface HarnessDecisions extends Harness {
  decisions: HarnessDecision[];
}

export function harnessDecisions(harness: Harness): HarnessDecisions {
  const decisions = routineDirs(harness.root).flatMap((dir) => {
    const routine = readRoutine(dir);
    return routineDecisions(dir).decisions.map((d) => ({ ...d, routine: routine.slug, title: routine.title, dir }));
  });
  decisions.sort((a, b) => (a.raised ?? "").localeCompare(b.raised ?? "") || a.id.localeCompare(b.id, undefined, { numeric: true }));
  return { ...harness, decisions };
}

export class DecisionRefusal extends Error {}

// The routine folder that holds an id: its slug first, then every routine.
function findRoutine(root: string, id: string): string {
  const slug = routineOf(id);
  if (!slug) throw new DecisionRefusal(`"${id}" is no decision id (<routine>-YYYYMMDD-<n>).`);
  const dirs = routineDirs(root);
  const own = join(root, SCHEDULED_DIR, slug);
  for (const dir of [own, ...dirs.filter((d) => d !== own)]) {
    if (readLogs(dir).some(({ parsed }) => parsed.sections.some((s) => s.decisions.some((d) => d.id === id)))) return dir;
  }
  throw new DecisionRefusal(`No decision ${id} in the run logs of ${relative(process.cwd(), join(root, SCHEDULED_DIR)) || SCHEDULED_DIR}/.`);
}

// The line range of the top `## ` section of a log text.
function topSection(lines: string[], headings: Set<number>): [number, number] | null {
  const tops = [...headings].filter((i) => lines[i].startsWith("## ")).sort((a, b) => a - b);
  return tops.length ? [tops[0], tops[1] ?? lines.length] : null;
}

// Adds a decision's block to the top section's `### Open decisions`, creating
// the subsection before `### Wrote` (or at the section's end) when missing.
export function carryInto(text: string, block: string[]): string {
  const lines = text.split(/\r?\n/);
  const headings = headingLines(lines);
  const range = topSection(lines, headings);
  if (!range) throw new DecisionRefusal("The newest run log has no section to carry the decision into.");
  const [start, end] = range;
  const subs = [...headings].filter((i) => i > start && i < end && lines[i].startsWith("### ")).sort((a, b) => a - b);
  const own = subs.find((i) => lines[i].slice(4).trim() === DECISIONS_HEADING);
  let at: number;
  let insert: string[];
  if (own !== undefined) {
    at = subs.find((i) => i > own) ?? end;
    while (at > own + 1 && !lines[at - 1].trim()) at--;
    insert = ["", ...block];
  } else {
    at = subs.find((i) => lines[i].slice(4).trim() === "Wrote") ?? end;
    while (at > start + 1 && !lines[at - 1].trim()) at--;
    insert = ["", `### ${DECISIONS_HEADING}`, "", ...block];
  }
  const after = lines.slice(at);
  const tail = after.length && after[0].trim() ? ["", ...after] : after;
  return [...lines.slice(0, at), ...insert, ...tail].join("\n");
}

export interface Recorded {
  routine: string;
  file: string; // where the new state was written
  carried: boolean; // copied into the newest section from an older one
  decision: Decision;
  day: string;
}

export interface RecordChange {
  choice?: string;
  applied?: string;
}

export async function recordDecision(root: string, id: string, change: RecordChange, now = Date.now(), opts: { dryRun?: boolean } = {}): Promise<Recorded> {
  if ((change.choice === undefined) === (change.applied === undefined)) throw new DecisionRefusal("Give either --choice <option|text> or --applied <what was done>.");
  const dir = findRoutine(root, id);
  return withFileLock(join(dir, RUNS_FILE), async () => {
    const routine = readRoutine(dir);
    const logs = readLogs(dir);
    let found: { file: string; decision: Decision } | null = null;
    for (const { file, parsed } of logs) {
      for (const s of parsed.sections) {
        const d = s.decisions.find((x) => x.id === id);
        if (d && !found) found = { file, decision: d };
      }
    }
    if (!found) throw new DecisionRefusal(`${id} is malformed in its run log — \`loopboard check\` says why.`);
    const { decision } = found;
    let next: DecisionChange;
    if (change.choice !== undefined) {
      if (decision.state !== "open") throw new DecisionRefusal(`${id} is already ${decision.state}${decision.answer ? ` (${decision.answer})` : ""}.`);
      const answer = normalizeChoice(change.choice, decision.options);
      if (!answer) throw new DecisionRefusal("--choice is an option's letter or the answer in words.");
      if (/^[A-Za-z]$/.test(answer) && !decision.interview && !decision.options.some((o) => o.key === answer)) {
        throw new DecisionRefusal(`${id} has no option ${answer}; its options are ${decision.options.map((o) => o.key).join(", ")}.`);
      }
      next = { answer };
    } else {
      if (decision.state === "open") throw new DecisionRefusal(`${id} isn't answered yet: record the answer with --choice first.`);
      if (decision.state !== "answered") throw new DecisionRefusal(`${id} is already ${decision.state}.`);
      const applied = (change.applied ?? "").replace(/\s+/g, " ").trim();
      if (!applied) throw new DecisionRefusal("--applied says in a few words what was done.");
      next = { applied };
    }
    const day = localDay(now, routine.timezone);
    const text = await readFile(join(dir, found.file), "utf8");
    const lines = text.split(/\r?\n/);
    const headings = headingLines(lines);
    const start = decision.line - 1;
    const block = changedBlock(lines.slice(start, blockEnd(lines, start, headings)), next, day);
    const newest = logs.find((l) => l.parsed.sections.length);
    const inNewest = newest?.file === found.file && newest.parsed.sections[0].heading === decision.section;
    const target = inNewest || !newest ? found.file : newest.file;
    const updated = inNewest
      ? [...lines.slice(0, start), ...block, ...lines.slice(blockEnd(lines, start, headings))].join("\n")
      : carryInto(target === found.file ? text : await readFile(join(dir, target), "utf8"), block);
    if (!opts.dryRun) await writeFileAtomic(join(dir, target), updated);
    const recorded = parseRunLog(updated).sections.flatMap((s) => s.decisions).find((d) => d.id === id) ?? decision;
    return { routine: routine.slug, file: `${relative(root, dir)}/${target}`, carried: !inNewest, decision: recorded, day };
  });
}
