import { existsSync, readdirSync, readFileSync, type Dirent } from "node:fs";
import { hostname } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import {
  describeSchedule,
  formatIso,
  isTimeZone,
  nextOccurrence,
  parseAt,
  parseCron,
  previousOccurrence,
  ScheduleError,
  systemTimeZone,
  type Schedule,
} from "../shared/cron";
import { frontmatterInner, readAnyList, readField, splitFrontmatter } from "../shared/frontmatter";
import { idProblem, readIdentity } from "./identity";
import { ALL_STATUSES, ASSIGNEES } from "./issues";
import { lastRun, parseRuns, type Run, type RunsProblem } from "./runs";
import { slugify } from "./workspaces";

// Routines (#0114, ADR-0010): one folder per routine under <root>/scheduled/,
// `routine.md` (schedule and settings in the frontmatter, steps in the body)
// and `runs.md`. Fields are read from their raw lines, never through YAML: a
// cron expression starts with `*`, and `at` would read as a date.

export const SCHEDULED_DIR = "scheduled";
export const ROUTINE_FILE = "routine.md";
export const RUNS_FILE = "runs.md";
export const DEFAULT_TIMEOUT = "2h";

const ROUTINE_FIELDS = [
  "title", "schedule", "at", "timezone", "enabled", "expires-after", "timeout", "host", "writes-to", "created", "creates",
] as const;
const ISSUE_FIELDS = [
  "period", "issue-title", "issue-category", "issue-status", "issue-assignee", "issue-labels", "issue-project", "issue-due-after",
] as const;

export const PERIODS = ["day", "week", "month", "quarter", "year"] as const;
export type Period = (typeof PERIODS)[number];
export const ISSUE_CATEGORIES = ["task", "user-story", "bug"] as const;

export interface RoutineProblem {
  level: "error" | "warning";
  message: string;
}

// What a `creates: issue` routine files each period (#0118).
export interface IssueSpec {
  period: Period;
  title: string;
  category: string;
  status: string;
  assignee: string;
  labels: string[];
  project: string | null;
  dueAfter: string | null;
}

export interface Routine {
  slug: string;
  dir: string;
  root: string;
  title: string;
  enabled: boolean;
  schedule: string | null;
  at: string | null;
  timezone: string;
  parsed: Schedule | null; // null when the schedule or the zone is broken
  expiresAfter: string | null;
  timeout: string;
  host: string | null;
  writesTo: string[];
  created: string | null;
  creates: IssueSpec | null;
  body: string;
  problems: RoutineProblem[];
  runs: Run[];
  runsProblems: RunsProblem[];
}

const DURATION = /^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?$/;
const MINUTE = 60_000;
export const DAY_MS = 24 * 60 * MINUTE;

// `30m`, `6h`, `2d`, `1h30m` in milliseconds; null when it isn't one.
export function parseDuration(text: string): number | null {
  const m = text.trim().match(DURATION);
  if (!m || m.slice(1).every((part) => part === undefined)) return null;
  const [d, h, min] = m.slice(1).map((part) => Number(part ?? 0));
  const ms = ((d * 24 + h) * 60 + min) * MINUTE;
  return ms > 0 ? ms : null;
}

export function machineName(): string {
  return hostname().toLowerCase().replace(/\.local$/, "");
}

function isDay(text: string): boolean {
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return !!m && new Date(`${text}T00:00:00Z`).getUTCDate() === Number(m[3]);
}

const TOP_KEY = /^([A-Za-z][\w-]*)[ \t]*:/gm;

export function readRoutine(dir: string, now = Date.now()): Routine {
  const root = dirname(dirname(dir));
  const problems: RoutineProblem[] = [];
  const error = (message: string) => problems.push({ level: "error", message });
  const warn = (message: string) => problems.push({ level: "warning", message });
  let text: string | null = null;
  try {
    text = readFileSync(join(dir, ROUTINE_FILE), "utf8").replace(/^﻿/, "");
  } catch {
    error(`has no ${ROUTINE_FILE}`);
  }
  const inner = text === null ? "" : frontmatterInner(text);
  if (inner === null) error(`${ROUTINE_FILE} has no frontmatter`);
  const fm = inner ?? "";
  const field = (key: string) => {
    const value = readField(fm, key);
    return value === undefined || value === "" ? null : value;
  };

  for (const [, key] of fm.matchAll(TOP_KEY)) {
    if (!(ROUTINE_FIELDS as readonly string[]).includes(key) && !(ISSUE_FIELDS as readonly string[]).includes(key)) warn(`unknown field "${key}"`);
  }

  const zoneText = field("timezone");
  const zoneOk = zoneText === null || isTimeZone(zoneText);
  if (!zoneOk) error(`timezone "${zoneText}" is no IANA time zone, such as Europe/Berlin`);
  const timezone = zoneText !== null && zoneOk ? zoneText : systemTimeZone();

  const schedule = field("schedule");
  const at = field("at");
  let parsed: Schedule | null = null;
  if (schedule !== null && at !== null) error("has both `schedule` and `at` — keep one");
  else if (schedule === null && at === null) error("has neither `schedule` nor `at`");
  else {
    try {
      parsed = schedule !== null ? { kind: "cron", cron: parseCron(schedule) } : { kind: "at", at: parseAt(at ?? "") };
    } catch (err) {
      if (!(err instanceof ScheduleError)) throw err;
      error(schedule !== null ? `schedule "${schedule}": ${err.message}` : `at: ${err.message}`);
    }
    if (parsed?.kind === "cron" && nextOccurrence(parsed, now, timezone) === null && previousOccurrence(parsed, now, timezone) === null) {
      error(`schedule "${schedule}" never occurs`);
      parsed = null;
    }
  }
  if (!zoneOk) parsed = null;

  const enabledText = field("enabled");
  if (enabledText !== null && !/^(true|false)$/.test(enabledText)) error(`enabled is true or false, not "${enabledText}"`);
  for (const key of ["expires-after", "timeout"]) {
    const value = field(key);
    if (value !== null && parseDuration(value) === null) error(`${key} "${value}" is no duration — write 30m, 6h, 2d or 1h30m`);
  }
  const created = field("created");
  if (created !== null && !isDay(created)) error(`created "${created}" is no day — write YYYY-MM-DD`);
  const writesTo = readAnyList(fm, "writes-to");
  for (const id of writesTo) {
    const problem = idProblem(id);
    if (problem) error(`writes-to "${id}" ${problem} — it names a harness by its id`);
  }

  const createsText = field("creates");
  if (createsText !== null && createsText !== "issue") error(`creates is "issue" or left out, not "${createsText}"`);
  let creates: IssueSpec | null = null;
  if (createsText === "issue") {
    const period = field("period");
    if (period === null) error("creates: issue needs `period:` — day, week, month, quarter or year");
    else if (!(PERIODS as readonly string[]).includes(period)) error(`period is day, week, month, quarter or year, not "${period}"`);
    const vocab = (key: string, allowed: readonly string[], fallback: string) => {
      const value = field(key) ?? fallback;
      if (!allowed.includes(value)) error(`${key} is ${allowed.join(", ")}, not "${value}"`);
      return value;
    };
    const category = vocab("issue-category", ISSUE_CATEGORIES, "task");
    const status = vocab("issue-status", ALL_STATUSES, "todo");
    const assignee = vocab("issue-assignee", ASSIGNEES, "agent");
    const dueAfter = field("issue-due-after");
    const dueMs = dueAfter === null ? null : parseDuration(dueAfter);
    if (dueAfter !== null && (dueMs === null || dueMs % DAY_MS !== 0)) error(`issue-due-after "${dueAfter}" is whole days, like 10d`);
    const project = field("issue-project");
    if (project !== null && !existsSync(join(root, "projects", project))) warn(`issue-project "${project}" is no project in this harness`);
    creates = {
      period: (PERIODS as readonly string[]).includes(period ?? "") ? (period as Period) : "month",
      title: field("issue-title") ?? `${field("title") ?? basename(dir)} {period}`,
      category,
      status,
      assignee,
      labels: readAnyList(fm, "issue-labels"),
      project,
      dueAfter,
    };
  } else {
    for (const key of ISSUE_FIELDS) if (field(key) !== null) warn(`${key} only counts with creates: issue`);
  }

  let runs: Run[] = [];
  let runsProblems: RunsProblem[] = [];
  try {
    ({ runs, problems: runsProblems } = parseRuns(readFileSync(join(dir, RUNS_FILE), "utf8")));
  } catch {
    // No runs yet.
  }
  for (const p of runsProblems) warn(`${RUNS_FILE} line ${p.line}: ${p.message}`);

  return {
    slug: basename(dir),
    dir,
    root,
    title: field("title") ?? basename(dir),
    enabled: enabledText !== "false",
    schedule,
    at,
    timezone,
    parsed: problems.some((p) => p.level === "error") ? null : parsed,
    expiresAfter: field("expires-after"),
    timeout: field("timeout") ?? DEFAULT_TIMEOUT,
    host: field("host"),
    writesTo,
    created,
    creates,
    body: text === null ? "" : splitFrontmatter(text).body.trim(),
    problems,
    runs,
    runsProblems,
  };
}

// Routine folders under a root, by name; `_templates` and dot folders aren't.
export function routineDirs(root: string): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(join(root, SCHEDULED_DIR), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("."))
    .map((e) => join(root, SCHEDULED_DIR, e.name))
    .sort();
}

export function readRoutines(root: string, now = Date.now()): Routine[] {
  return routineDirs(root).map((dir) => readRoutine(dir, now));
}

export function isValid(routine: Routine): boolean {
  return !routine.problems.some((p) => p.level === "error");
}

// ── Harnesses ────────────────────────────────────────────────────────

export interface Harness {
  id: string;
  name: string;
  path: string; // the harness folder
  root: string; // its .agents/ (or legacy ai/)
}

// Only `.agents/issues` or `ai/issues` make a harness here: a folder of
// documents may have an `issues/` of its own.
function rootIn(folder: string): string | null {
  for (const candidate of [".agents", "ai"]) {
    if (existsSync(join(folder, candidate, "issues"))) return join(folder, candidate);
  }
  return null;
}

export function harnessFor(path: string, root: string): Harness {
  const identity = readIdentity(path);
  return {
    id: identity?.id || slugify(basename(path)) || "workspace",
    name: identity?.name || basename(path),
    path,
    root,
  };
}

// macOS packages look like folders and hold no harness.
const PACKAGE_RE = /\.(app|bundle|sparsebundle|photoslibrary|framework|pkg|xcodeproj|xcworkspace)$/i;
const MAX_DEPTH = 16;

// Every harness physically under `dir`, `dir` included (ADR-0010): no
// symlinks, no hidden folders, no node_modules, no macOS packages.
export function harnessesUnder(dir: string): Harness[] {
  const out: Harness[] = [];
  const walk = (folder: string, depth: number) => {
    const root = rootIn(folder);
    if (root) out.push(harnessFor(folder, root));
    if (depth >= MAX_DEPTH) return;
    let entries: Dirent[];
    try {
      entries = readdirSync(folder, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!e.isDirectory() || e.name.startsWith(".") || e.name === "node_modules" || PACKAGE_RE.test(e.name)) continue;
      walk(join(folder, e.name), depth + 1);
    }
  };
  walk(resolve(dir), 0);
  return out;
}

// ── Summaries (`list --json`, the board) ─────────────────────────────

export type RoutineState = "invalid" | "paused" | "running" | "idle";

export interface RoutineSummary {
  slug: string;
  dir: string;
  title: string;
  kind: "agent" | "issue";
  enabled: boolean;
  state: RoutineState;
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
  lastRun: Run | null;
  runs: Run[];
  problems: RoutineProblem[];
  body: string;
}

export function routineState(routine: Routine): RoutineState {
  if (!isValid(routine)) return "invalid";
  if (!routine.enabled) return "paused";
  if (lastRun(routine.runs)?.status === "running") return "running";
  return "idle";
}

export function summarizeRoutine(routine: Routine, now: number): RoutineSummary {
  const state = routineState(routine);
  const next = routine.parsed && state !== "paused" ? nextOccurrence(routine.parsed, now, routine.timezone) : null;
  return {
    slug: routine.slug,
    dir: routine.dir,
    title: routine.title,
    kind: routine.creates ? "issue" : "agent",
    enabled: routine.enabled,
    state,
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
    next: next === null ? null : formatIso(next, routine.timezone),
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

export function listRoutines(harnesses: Harness[], now = Date.now()): RoutinesList {
  return {
    version: ROUTINES_JSON_VERSION,
    host: machineName(),
    now: formatIso(now, systemTimeZone()),
    harnesses: harnesses.map((h) => ({ ...h, routines: readRoutines(h.root, now).map((r) => summarizeRoutine(r, now)) })),
  };
}
