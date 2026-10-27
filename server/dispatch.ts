import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describeSchedule, formatIso, formatLocal, formatWhen, nextOccurrence, occurrencesBetween, previousOccurrence, systemTimeZone, zonedInstant } from "../shared/cron";
import { frontmatterInner, setLine } from "../shared/frontmatter";
import { withFileLock, writeFileAtomic } from "./files";
import { isValid, machineName, parseDuration, readRoutine, readRoutines, ROUTINE_FILE, RUNS_FILE, type Harness, type IssueSpec, type Routine, type RoutineProblem } from "./routines";
import { fileIssue, type FiledIssue } from "./recurrence";
import { appendTo, lastRun, type NewEntry, type Run } from "./runs";

// What a dispatcher asks and records (#0116, #0117, ADR-0010): when a slot
// is due, the entries `start`, `finish` and `due` append to runs.md, and the
// summaries `routines list --json` and the board show. Every write holds
// runs.md's lock and re-reads the routine inside it.

export type DueState = "invalid" | "paused" | "pinned" | "running" | "due" | "expired" | "idle";

export interface Evaluation {
  state: DueState;
  slot: number | null; // the latest occurrence ≤ now that counts
  open: Run | null; // a run in progress, or one past its timeout
  stale: boolean; // `open` outlived its timeout: it becomes aborted
  missed: number[]; // unhandled occurrences before `slot`
}

const STATES_OF_A_RUN = ["running", "ok", "failed", "aborted"];

// The newest run start or expiry record: a slot at or before it is handled.
function handledUntil(runs: Run[]): number | null {
  let latest: number | null = null;
  for (const run of runs) {
    if (!STATES_OF_A_RUN.includes(run.status) && run.status !== "expired") continue;
    const t = Date.parse(run.status === "expired" ? (run.recorded ?? run.at) : (run.started ?? run.at));
    if (latest === null || t > latest) latest = t;
  }
  return latest;
}

function createdStart(routine: Routine): number | null {
  if (!routine.created) return null;
  const [year, month, day] = routine.created.split("-").map(Number);
  return zonedInstant({ year, month, day, hour: 0, minute: 0 }, routine.timezone);
}

export function evaluate(routine: Routine, now: number, host = machineName()): Evaluation {
  const none: Evaluation = { state: "idle", slot: null, open: null, stale: false, missed: [] };
  if (!isValid(routine) || !routine.parsed) return { ...none, state: "invalid" };
  if (!routine.enabled) return { ...none, state: "paused" };
  if (routine.host && routine.host.toLowerCase().replace(/\.local$/, "") !== host) return { ...none, state: "pinned" };
  const last = lastRun(routine.runs);
  const open = last?.status === "running" ? last : null;
  const timeout = parseDuration(routine.timeout) ?? 0;
  if (open && now - Date.parse(open.at) < timeout) return { ...none, state: "running", open };
  const stale = open !== null;
  const since = createdStart(routine);
  const slot = previousOccurrence(routine.parsed, now, routine.timezone);
  if (slot === null || (since !== null && slot < since)) return { ...none, open, stale };
  const handled = handledUntil(routine.runs);
  if (handled !== null && slot <= handled) return { ...none, open, stale };
  // Missed slots count from the last handled one, or from the created day.
  const from = handled ?? (since === null ? null : since - 1);
  const missed = from === null ? [] : occurrencesBetween(routine.parsed, from, slot - 1, routine.timezone);
  const late = routine.expiresAfter === null ? null : parseDuration(routine.expiresAfter);
  const state = late !== null && now - slot > late ? "expired" : "due";
  return { state, slot, open, stale, missed };
}

// `7h 32m`, `2d 3h`, `45m`.
export function spell(ms: number): string {
  const minutes = Math.round(ms / 60000);
  const [d, h, m] = [Math.floor(minutes / 1440), Math.floor((minutes % 1440) / 60), minutes % 60];
  return [d && `${d}d`, h && `${h}h`, (m || (!d && !h)) && `${m}m`].filter(Boolean).join(" ");
}

function iso(routine: Routine, t: number): string {
  return formatIso(t, routine.timezone);
}

export function abortedEntry(routine: Routine, open: Run, now: number): NewEntry {
  return {
    heading: formatLocal(Date.parse(open.at), routine.timezone),
    status: "aborted",
    fields: [["started", open.started], ["finished", iso(routine, now)], ["slot", open.slot], ["host", open.host]],
    note: `No finish within ${routine.timeout}; marked aborted when the routine was checked again.`,
  };
}

export function missedEntry(routine: Routine, missed: number[], now: number): NewEntry {
  const n = missed.length;
  return {
    heading: formatLocal(now, routine.timezone),
    status: "missed",
    fields: [["recorded", iso(routine, now)], ["from", iso(routine, missed[0])], ["to", iso(routine, missed[n - 1])], ["slots", n]],
    note: `${n} earlier ${n === 1 ? "slot" : "slots"} weren't run; the next run covers ${n === 1 ? "it" : "them"}.`,
  };
}

export function expiredEntry(routine: Routine, slot: number, now: number): NewEntry {
  return {
    heading: formatLocal(now, routine.timezone),
    status: "expired",
    fields: [["recorded", iso(routine, now)], ["slot", iso(routine, slot)]],
    note: `${spell(now - slot)} after the slot; expires-after is ${routine.expiresAfter}.`,
  };
}

// Appends under runs.md's lock to the file as it is then.
export async function appendEntries(routine: Routine, entries: NewEntry[]): Promise<void> {
  if (!entries.length) return;
  const file = join(routine.dir, RUNS_FILE);
  const existing = await readFile(file, "utf8").catch(() => null);
  await writeFileAtomic(file, appendTo(existing, routine.title, entries));
}

export function withRoutineLock<T>(dir: string, run: () => Promise<T>): Promise<T> {
  return withFileLock(join(dir, RUNS_FILE), run);
}

// A one-time routine switches itself off after its run (decision 4). Only
// the `enabled:` line changes.
export async function switchOff(routine: Routine): Promise<boolean> {
  if (routine.at === null || !routine.enabled) return false;
  const file = join(routine.dir, ROUTINE_FILE);
  const text = await readFile(file, "utf8");
  const inner = frontmatterInner(text.replace(/^﻿/, ""));
  if (inner === null) return false;
  const next = setLine(inner, "enabled", "false", ["timezone", "at", "title"]);
  await writeFileAtomic(file, text.replace(/^(﻿?)---\r?\n[\s\S]*?\r?\n---/, (_m, bom: string) => `${bom}---\n${next}\n---`));
  return true;
}

export class RoutineRefusal extends Error {}

export interface Started {
  kind: "started";
  run: Run;
  slot: number | null;
  missed: number;
  aborted: Run | null;
}

// A `creates: issue` routine runs without an agent: its run is the filing.
export interface Filed {
  kind: "filed";
  run: Run;
  slot: number | null;
  missed: number;
  aborted: Run | null;
  issue: FiledIssue | null; // null when filing failed; the run says why
}

function refuse(routine: Routine, ev: Evaluation, now: number, host: string): void {
  if (ev.state === "invalid") throw new RoutineRefusal(`${routine.slug} is invalid — \`loopboard check\` says why.`);
  if (ev.state === "paused") throw new RoutineRefusal(`${routine.slug} is paused — set \`enabled: true\` to run it.`);
  if (ev.state === "pinned") throw new RoutineRefusal(`${routine.slug} runs on ${routine.host} only; this machine is ${host}.`);
  if (ev.state === "running" && ev.open) {
    const since = formatWhen(Date.parse(ev.open.at), routine.timezone, now);
    throw new RoutineRefusal(`${routine.slug} is running since ${since}${ev.open.host ? ` on ${ev.open.host}` : ""}; its timeout is ${routine.timeout}.`);
  }
}

function filedNote(issue: FiledIssue): string {
  return issue.existing
    ? `#${issue.id} for ${issue.period} is there already (${issue.file}); nothing filed.`
    : `Filed #${issue.id} ${issue.title} (${issue.file}).`;
}

// Files the period's issue and records the run as ok — or failed, with why.
async function fileRun(routine: Routine, ev: Evaluation, now: number, host: string, dryRun: boolean): Promise<Filed> {
  const spec = routine.creates;
  if (!spec) throw new Error("fileRun needs a creates: issue routine");
  const due = ev.state === "due" ? ev.slot : null;
  const entries: NewEntry[] = [];
  if (ev.stale && ev.open) entries.push(abortedEntry(routine, ev.open, now));
  if (due !== null && ev.missed.length) entries.push(missedEntry(routine, ev.missed, now));
  let issue: FiledIssue | null = null;
  let note: string;
  try {
    issue = await fileIssue(routine, spec, due ?? now, now, dryRun);
    note = filedNote(issue);
  } catch (err) {
    note = `Filing the issue failed: ${err instanceof Error ? err.message : String(err)}`;
  }
  const run: Run = {
    status: issue ? "ok" : "failed",
    at: iso(routine, now),
    started: iso(routine, now),
    finished: iso(routine, now),
    ...(due !== null && { slot: iso(routine, due) }),
    host,
    note,
  };
  entries.push({ heading: formatLocal(now, routine.timezone), status: run.status, fields: [["started", run.started], ["finished", run.finished], ["slot", run.slot], ["host", host]], note });
  if (!dryRun) {
    await appendEntries(routine, entries);
    await switchOff(routine);
  }
  return { kind: "filed", run, slot: due, missed: due === null ? 0 : ev.missed.length, aborted: ev.stale ? ev.open : null, issue };
}

// `routines start` (#0116): records the start of a run. A slot is filled in
// when the routine is due; otherwise it's a manual run. A `creates: issue`
// routine files the period's issue instead (#0118).
export async function startRun(dir: string, now = Date.now(), opts: { dryRun?: boolean; host?: string } = {}): Promise<Started | Filed> {
  const host = opts.host ?? machineName();
  return withRoutineLock(dir, async () => {
    const routine = readRoutine(dir, now);
    const ev = evaluate(routine, now, host);
    refuse(routine, ev, now, host);
    if (routine.creates) return fileRun(routine, ev, now, host, !!opts.dryRun);
    const entries: NewEntry[] = [];
    if (ev.stale && ev.open) entries.push(abortedEntry(routine, ev.open, now));
    const slot = ev.state === "due" ? ev.slot : null;
    if (slot !== null && ev.missed.length) entries.push(missedEntry(routine, ev.missed, now));
    const run: Run = {
      status: "running",
      at: iso(routine, now),
      started: iso(routine, now),
      ...(slot !== null && { slot: iso(routine, slot) }),
      host,
      note: "",
    };
    entries.push({ heading: formatLocal(now, routine.timezone), status: "running", fields: [["started", run.started], ["slot", run.slot], ["host", host]] });
    if (!opts.dryRun) await appendEntries(routine, entries);
    return { kind: "started", run, slot, missed: slot === null ? 0 : ev.missed.length, aborted: ev.stale ? ev.open : null };
  });
}

export const FINISH_STATUSES = ["ok", "failed"] as const;
export type FinishStatus = (typeof FINISH_STATUSES)[number];

export interface Finished {
  run: Run;
  switchedOff: boolean;
}

// `routines finish` (#0116): closes the open run — or one that outlived its
// timeout and reports late; a late result beats none.
export async function finishRun(dir: string, status: FinishStatus, note: string, now = Date.now(), opts: { dryRun?: boolean } = {}): Promise<Finished> {
  if (!note.trim()) throw new RoutineRefusal("A run ends with a short note: what it did, what stands out, what the next run should know.");
  return withRoutineLock(dir, async () => {
    const routine = readRoutine(dir, now);
    const open = lastRun(routine.runs);
    if (!open || (open.status !== "running" && open.status !== "aborted")) {
      throw new RoutineRefusal(`${routine.slug} has no open run — \`loopboard routines start\` records one.`);
    }
    const run: Run = { ...open, status, finished: iso(routine, now), note: note.trim() };
    const entry: NewEntry = {
      heading: formatLocal(Date.parse(open.at), routine.timezone),
      status,
      fields: [["started", open.started], ["finished", run.finished], ["slot", open.slot], ["host", open.host]],
      note: run.note,
    };
    if (opts.dryRun) return { run, switchedOff: routine.at !== null && routine.enabled };
    await appendEntries(routine, [entry]);
    return { run, switchedOff: await switchOff(routine) };
  });
}

// ── Summaries (`list --json`, the board) ─────────────────────────────

export interface RoutineSummary {
  slug: string;
  dir: string;
  title: string;
  kind: "agent" | "issue";
  enabled: boolean;
  state: DueState;
  schedule: string | null;
  at: string | null;
  timezone: string;
  words: string;
  expiresAfter: string | null;
  timeout: string;
  host: string | null;
  writesTo: string[];
  created: string | null;
  creates: IssueSpec | null;
  next: string | null;
  slot: string | null;
  lastRun: Run | null;
  runs: Run[];
  problems: RoutineProblem[];
  body: string;
}

export function summarizeRoutine(routine: Routine, now: number, host = machineName()): RoutineSummary {
  const ev = evaluate(routine, now, host);
  const next = routine.parsed && routine.enabled ? nextOccurrence(routine.parsed, now, routine.timezone) : null;
  return {
    slug: routine.slug,
    dir: routine.dir,
    title: routine.title,
    kind: routine.creates ? "issue" : "agent",
    enabled: routine.enabled,
    state: ev.state,
    schedule: routine.schedule,
    at: routine.at,
    timezone: routine.timezone,
    words: routine.parsed ? describeSchedule(routine.parsed) : "invalid schedule",
    expiresAfter: routine.expiresAfter,
    timeout: routine.timeout,
    host: routine.host,
    writesTo: routine.writesTo,
    created: routine.created,
    creates: routine.creates,
    next: next === null ? null : iso(routine, next),
    slot: ev.slot === null ? null : iso(routine, ev.slot),
    lastRun: lastRun(routine.runs),
    runs: routine.runs,
    problems: routine.problems,
    body: routine.body,
  };
}

export interface HarnessRoutines extends Harness {
  routines: RoutineSummary[];
}

export const ROUTINES_JSON_VERSION = 1;

export interface RoutinesList {
  version: number;
  host: string;
  now: string;
  harnesses: HarnessRoutines[];
}

export function listRoutines(harnesses: Harness[], now = Date.now(), host = machineName()): RoutinesList {
  return {
    version: ROUTINES_JSON_VERSION,
    host,
    now: formatIso(now, systemTimeZone()),
    harnesses: harnesses.map((h) => ({ ...h, routines: readRoutines(h.root, now).map((r) => summarizeRoutine(r, now, host)) })),
  };
}


// ── due (#0117) ──────────────────────────────────────────────────────

export interface DueRef {
  harness: { id: string; name: string; path: string };
  slug: string;
  dir: string;
  title: string;
}

export interface DueReport {
  version: number;
  host: string;
  now: string;
  dryRun: boolean;
  // Agent routines to run now, one after another: start, prompt, finish.
  run: (DueRef & { slot: string; missed: number })[];
  // `creates: issue` routines `due` ran itself (#0118); `issue` is null when filing failed.
  filed: (DueRef & { slot: string; status: "ok" | "failed"; issue: FiledIssue | null; note: string })[];
  expired: (DueRef & { slot: string; late: string })[];
  aborted: (DueRef & { started: string; host: string | null })[];
  running: (DueRef & { started: string; host: string | null })[];
  problems: (DueRef & { problems: RoutineProblem[] })[];
}

// `loopboard routines due` (#0117): what is due now, with the bookkeeping
// that needs no agent written — aborted runs, expired slots, the period's
// issue — unless `dryRun`.
export async function dueAll(harnesses: Harness[], now = Date.now(), opts: { dryRun?: boolean; host?: string } = {}): Promise<DueReport> {
  const host = opts.host ?? machineName();
  const dryRun = !!opts.dryRun;
  const report: DueReport = {
    version: ROUTINES_JSON_VERSION,
    host,
    now: formatIso(now, systemTimeZone()),
    dryRun,
    run: [],
    filed: [],
    expired: [],
    aborted: [],
    running: [],
    problems: [],
  };
  for (const h of harnesses) {
    for (const dir of readRoutines(h.root, now).map((r) => r.dir)) {
      await withRoutineLock(dir, async () => {
        const routine = readRoutine(dir, now);
        const ref: DueRef = { harness: { id: h.id, name: h.name, path: h.path }, slug: routine.slug, dir, title: routine.title };
        const ev = evaluate(routine, now, host);
        if (ev.state === "invalid") {
          report.problems.push({ ...ref, problems: routine.problems.filter((p) => p.level === "error") });
          return;
        }
        if (ev.state === "running" && ev.open) {
          report.running.push({ ...ref, started: ev.open.at, host: ev.open.host ?? null });
          return;
        }
        if (ev.stale && ev.open) report.aborted.push({ ...ref, started: ev.open.at, host: ev.open.host ?? null });
        if (ev.slot !== null && ev.state === "due" && routine.creates) {
          const filed = await fileRun(routine, ev, now, host, dryRun);
          report.filed.push({ ...ref, slot: iso(routine, ev.slot), status: filed.issue ? "ok" : "failed", issue: filed.issue, note: filed.run.note });
          return;
        }
        const entries: NewEntry[] = [];
        if (ev.stale && ev.open) entries.push(abortedEntry(routine, ev.open, now));
        if (ev.slot !== null && ev.state === "expired") {
          if (ev.missed.length) entries.push(missedEntry(routine, ev.missed, now));
          entries.push(expiredEntry(routine, ev.slot, now));
          report.expired.push({ ...ref, slot: iso(routine, ev.slot), late: spell(now - ev.slot) });
        }
        if (ev.slot !== null && ev.state === "due") report.run.push({ ...ref, slot: iso(routine, ev.slot), missed: ev.missed.length });
        if (dryRun) return;
        await appendEntries(routine, entries);
        if (ev.state === "expired") await switchOff(routine);
      });
    }
  }
  return report;
}
