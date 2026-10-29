import { issueRefs } from '../shared/refs';
import { needsYou } from './inbox';
import { newestFirst, runTone, type RunTone } from './routines';
import type { Issue, Project, ProjectSession, RoutineSummary, Run } from './types';

// Home (project 06): the workspace's timeline of routine runs, sessions and
// filed issues, and the routine-health column beside it. Pure — the view
// only renders what `buildHome` returns.

export const HOME_PERIODS = ['today', '7d', '30d'] as const;
export type HomePeriod = (typeof HOME_PERIODS)[number];
export const PERIOD_LABEL: Record<HomePeriod, string> = { today: 'Today', '7d': '7 days', '30d': '30 days' };
const PERIOD_DAYS: Record<HomePeriod, number> = { today: 0, '7d': 7, '30d': 30 };

export function isHomePeriod(value: unknown): value is HomePeriod {
  return typeof value === 'string' && (HOME_PERIODS as readonly string[]).includes(value);
}

const DAY_MS = 86_400_000;
const SUMMARY_MAX = 170;
const HEADING_MAX = 40;

// A run's date and time as `runs.md` wrote them, in the routine's zone.
export const runDay = (run: Run): string => run.at.slice(0, 10);
export const runTime = (run: Run): string => run.at.slice(11, 16);
// Identifies a run within its routine in links: `2026-10-29T0953`.
export const runKey = (run: Run): string => `${runDay(run)}T${runTime(run).replace(':', '')}`;

export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max - 30 ? cut.slice(0, space) : cut).replace(/[\s,;:·–-]+$/, '')}…`;
}

const plain = (line: string) =>
  line
    .replace(/^\s*(?:#+|[-*+]|\d+\.|>)\s+/, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim();

// The note's first line; a heading-like first line takes the next along.
// Returns the summary and the lines it didn't use.
export function splitRunNote(note: string): { head: string; rest: string } {
  const lines = note.split('\n');
  let i = lines.findIndex((l) => l.trim());
  if (i < 0) return { head: '', rest: '' };
  let head = plain(lines[i]);
  if (head.length < HEADING_MAX && lines[i + 1]?.trim()) {
    i++;
    head = `${head} · ${plain(lines[i])}`;
  }
  return { head, rest: lines.slice(i + 1).join('\n').replace(/^\s*\n/, '') };
}

export function runSummary(run: Run): string {
  const { head } = splitRunNote(run.note ?? '');
  if (head) return clip(head, SUMMARY_MAX);
  if (run.status === 'running') return `Running since ${runTime(run)}`;
  return '';
}

// Issues a run filed (referenced, or matched by `recurrence`, and created on
// the run's day) and the other existing issues its note references.
export function issuesOfRun(run: Run, routine: RoutineSummary, byId: Map<string, Issue>): { filed: Issue[]; mentioned: Issue[] } {
  const day = runDay(run);
  const filed: Issue[] = [];
  const mentioned: Issue[] = [];
  const seen = new Set<string>();
  for (const { id } of issueRefs(run.note ?? '')) {
    const issue = byId.get(id);
    if (!issue || seen.has(id)) continue;
    seen.add(id);
    (issue.created === day ? filed : mentioned).push(issue);
  }
  if (routine.kind === 'issue') {
    for (const issue of byId.values()) {
      if (!seen.has(issue.id) && issue.created === day && issue.recurrence?.startsWith(`${routine.slug}@`)) filed.push(issue);
    }
  }
  return { filed, mentioned };
}

export interface RunEntry {
  kind: 'run';
  key: string;
  // The run's part of its preview link (`runKey`).
  link: string;
  routine: RoutineSummary;
  run: Run;
  day: string;
  time: string;
  summary: string;
  tone: RunTone;
  filed: Issue[];
  mentioned: Issue[];
  collapsed: boolean;
  isNew: boolean;
}
export interface SessionEntry {
  kind: 'session';
  key: string;
  project: Project;
  session: ProjectSession;
  day: string;
  summary: string;
  mentioned: Issue[];
  isNew: boolean;
}
export interface IssueEntry {
  kind: 'issue';
  key: string;
  issue: Issue;
  day: string;
  isNew: boolean;
}
export type HomeEntry = RunEntry | SessionEntry | IssueEntry;
export interface HomeDay {
  day: string;
  entries: HomeEntry[];
}

export type HealthTone = RunTone | 'paused' | 'none';
export interface HealthRow {
  routine: RoutineSummary;
  tone: HealthTone;
  label: string;
  last: Run | null;
  // Oldest first, so the strip reads left to right.
  strip: Run[];
}

export interface HomeInput {
  issues: Issue[];
  projects: Project[];
  routines: RoutineSummary[];
  // Local calendar day and instant of "now".
  today: string;
  now: number;
  period: HomePeriod;
  // When this browser last marked Home seen; null = the last 24 hours are new.
  lastSeen: number | null;
}

export interface Home {
  start: string;
  days: HomeDay[];
  health: HealthRow[];
  needsYou: Issue[];
  projects: Project[];
  newCount: number;
}

export function periodStart(today: string, period: HomePeriod): string {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - PERIOD_DAYS[period]);
  return d.toISOString().slice(0, 10);
}

function localDayOf(instant: number): string {
  const d = new Date(instant);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Quiet runs shrink to one line: ok and nothing to show, or an issue
// routine that filed nothing.
function isQuiet(entry: Pick<RunEntry, 'tone' | 'filed' | 'mentioned' | 'routine'>): boolean {
  if (entry.filed.length) return false;
  if (entry.routine.kind === 'issue') return true;
  return entry.tone === 'ok' && !entry.mentioned.length;
}

export function runEntry(routine: RoutineSummary, run: Run, byId: Map<string, Issue>, seenAt = Infinity): RunEntry {
  const { filed, mentioned } = issuesOfRun(run, routine, byId);
  const tone = runTone(run.status);
  const entry = { routine, filed, mentioned, tone };
  return {
    kind: 'run',
    key: `r:${routine.slug}:${runKey(run)}`,
    link: runKey(run),
    routine,
    run,
    day: runDay(run),
    time: runTime(run),
    summary: runSummary(run),
    tone,
    filed,
    mentioned,
    collapsed: isQuiet(entry),
    isNew: Date.parse(run.at) > seenAt,
  };
}

const KIND_ORDER = { run: 0, session: 1, issue: 2 } as const;

function healthOf(routine: RoutineSummary): HealthRow {
  const runs = newestFirst(routine.runs);
  const last = runs[0] ?? null;
  const strip = runs.slice(0, 10).reverse();
  if (!routine.enabled || routine.state === 'paused') return { routine, tone: 'paused', label: 'Paused', last, strip };
  if (routine.state === 'running' || last?.status === 'running') return { routine, tone: 'running', label: 'Running', last, strip };
  if (!last) return { routine, tone: 'none', label: 'No runs yet', last, strip };
  return { routine, tone: runTone(last.status), label: '', last, strip };
}

export function buildHome(input: HomeInput): Home {
  const start = periodStart(input.today, input.period);
  const seenAt = input.lastSeen ?? input.now - DAY_MS;
  const seenDay = localDayOf(seenAt);
  const live = input.issues.filter((i) => !i.archived);
  const byId = new Map(live.map((i) => [i.id, i]));
  const entries: HomeEntry[] = [];
  const nested = new Set<string>();

  for (const routine of input.routines) {
    for (const run of routine.runs) {
      if (runDay(run) < start) continue;
      const entry = runEntry(routine, run, byId, seenAt);
      entry.filed.forEach((i) => nested.add(i.id));
      entries.push(entry);
    }
  }
  for (const project of input.projects) {
    for (const session of project.sessions) {
      if (!session.date || session.date < start) continue;
      const mentioned = issueRefs(session.note)
        .map((r) => byId.get(r.id))
        .filter((i): i is Issue => i !== undefined)
        .filter((i, n, all) => all.indexOf(i) === n);
      entries.push({
        kind: 'session',
        key: `s:${project.slug}:${session.date}`,
        project,
        session,
        day: session.date,
        summary: clip(splitRunNote(session.note).head, 220),
        mentioned,
        isNew: session.date > seenDay,
      });
    }
  }
  for (const issue of live) {
    if (!issue.created || issue.created < start || nested.has(issue.id)) continue;
    entries.push({ kind: 'issue', key: `i:${issue.id}`, issue, day: issue.created, isNew: issue.created > seenDay });
  }

  entries.sort(
    (a, b) =>
      b.day.localeCompare(a.day) ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      (a.kind === 'run' && b.kind === 'run' ? Date.parse(b.run.at) - Date.parse(a.run.at) : 0) ||
      b.key.localeCompare(a.key),
  );
  const days: HomeDay[] = [];
  for (const entry of entries) {
    const last = days[days.length - 1];
    if (last?.day === entry.day) last.entries.push(entry);
    else days.push({ day: entry.day, entries: [entry] });
  }

  const newCount = entries.reduce((n, e) => n + (e.isNew ? 1 : 0) + (e.kind === 'run' && e.isNew ? e.filed.length : 0), 0);
  const needs = live
    .filter(needsYou)
    .sort(
      (a, b) =>
        Number(b.status === 'in-review') - Number(a.status === 'in-review') ||
        (b.created ?? '').localeCompare(a.created ?? '') ||
        b.id.localeCompare(a.id),
    );
  const projects = input.projects
    .filter((p) => p.status !== 'shipped' && p.lastSession)
    .sort((a, b) => (b.lastSession ?? '').localeCompare(a.lastSession ?? ''))
    .slice(0, 4);

  return { start, days, health: input.routines.map(healthOf), needsYou: needs, projects, newCount };
}

// Where an issue came from, for its preview: the run that filed it and the
// runs that mention it, newest first.
export function issueOrigins(issue: Issue, routines: RoutineSummary[], issues: Issue[]): { filedBy: RunEntry | null; mentionedIn: RunEntry[] } {
  const byId = new Map(issues.filter((i) => !i.archived).map((i) => [i.id, i]));
  let filedBy: RunEntry | null = null;
  const mentionedIn: RunEntry[] = [];
  for (const routine of routines) {
    for (const run of routine.runs) {
      const entry = runEntry(routine, run, byId);
      if (entry.filed.some((i) => i.id === issue.id)) filedBy ??= entry;
      else if (entry.mentioned.some((i) => i.id === issue.id)) mentionedIn.push(entry);
    }
  }
  mentionedIn.sort((a, b) => Date.parse(b.run.at) - Date.parse(a.run.at));
  return { filedBy, mentionedIn };
}

// A run by its link key, with its neighbours in time.
export function findRun(routines: RoutineSummary[], slug: string, key: string): { routine: RoutineSummary; run: Run; older: Run | null; newer: Run | null } | null {
  const routine = routines.find((r) => r.slug === slug);
  if (!routine) return null;
  const runs = newestFirst(routine.runs);
  const i = runs.findIndex((r) => runKey(r) === key);
  if (i < 0) return null;
  return { routine, run: runs[i], older: runs[i + 1] ?? null, newer: runs[i - 1] ?? null };
}

// `?peek=` targets (#0130, #0131).
export type Peek =
  | { kind: 'run'; slug: string; key: string }
  | { kind: 'issue'; id: string }
  | { kind: 'project'; slug: string }
  | { kind: 'routine'; slug: string };

export function parsePeek(value: unknown): Peek | null {
  if (typeof value !== 'string') return null;
  const [kind, a, b] = value.split('/');
  if (kind === 'run' && a && b && /^\d{4}-\d{2}-\d{2}T\d{4}$/.test(b)) return { kind, slug: a, key: b };
  if (kind === 'issue' && /^\d{4}$/.test(a ?? '')) return { kind, id: a };
  if ((kind === 'project' || kind === 'routine') && a) return { kind, slug: a };
  return null;
}

export function peekValue(peek: Peek): string {
  switch (peek.kind) {
    case 'run':
      return `run/${peek.slug}/${peek.key}`;
    case 'issue':
      return `issue/${peek.id}`;
    default:
      return `${peek.kind}/${peek.slug}`;
  }
}
