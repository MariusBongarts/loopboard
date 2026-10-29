import { addDays, formatWhen, GRAPH_WEEKS, graphStart, localDay, weekdayOf, type LocalDate } from '../shared/cron';
import type { GraphDay, RoutineSummary, Run, RunStatus } from './types';

// The Routines view's pure parts (#0120, #0121): labels, tones, durations
// and the contribution graph's layout.

export const RUN_LABEL: Record<RunStatus, string> = {
  running: 'Running',
  ok: 'OK',
  failed: 'Failed',
  aborted: 'Aborted',
  expired: 'Expired',
  missed: 'Missed',
};

// One color family per meaning, shared with the graph (#0121): a run that
// worked, one that didn't, a slot that wasn't run, one in progress.
export type RunTone = 'ok' | 'failed' | 'missed' | 'running';

export function runTone(status: RunStatus): RunTone {
  if (status === 'ok') return 'ok';
  if (status === 'failed' || status === 'aborted') return 'failed';
  if (status === 'running') return 'running';
  return 'missed';
}

// What a row says next to the schedule; empty when there is nothing to say.
export function stateLabel(routine: RoutineSummary): string {
  switch (routine.state) {
    case 'invalid':
      return 'Invalid';
    case 'paused':
      return 'Paused';
    case 'pinned':
      return `On ${routine.host} only`;
    case 'running':
      return 'Running';
    case 'due':
      return 'Due';
    default:
      return '';
  }
}

// `12 min`, `2 h 5 min`, `under a minute`; empty when the run has no end.
export function runDuration(run: Run): string {
  if (!run.started || !run.finished) return '';
  const minutes = Math.round((Date.parse(run.finished) - Date.parse(run.started)) / 60000);
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  return minutes % 60 ? `${h} h ${minutes % 60} min` : `${h} h`;
}

// `today 15:00`, `Mon 2 Nov 07:30` in the routine's zone; `—` without a time.
export function routineWhen(iso: string | null | undefined, routine: RoutineSummary, now: number): string {
  return iso ? formatWhen(Date.parse(iso), routine.timezone, now) : '—';
}

// The next slot, or why there is none: due, running, paused.
export function nextSlotText(routine: RoutineSummary, now: number): string {
  if (routine.state === 'invalid' || routine.state === 'paused') return '—';
  if (routine.state === 'due' && routine.slot) return `Due since ${routineWhen(routine.slot, routine, now)}`;
  if (routine.state === 'running' && routine.lastRun) return `Running since ${routineWhen(routine.lastRun.at, routine, now)}`;
  return routineWhen(routine.next, routine, now);
}

export function newestFirst(runs: Run[]): Run[] {
  return [...runs].reverse();
}

// The first error, else the first warning — the one line a row shows.
export function firstProblem(routine: RoutineSummary): string | null {
  const p = routine.problems.find((x) => x.level === 'error') ?? routine.problems[0];
  return p ? `${p.file}: ${p.message}` : null;
}

// ── Contribution graph (#0121) ───────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDay(date: string): LocalDate {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

function dayText(d: LocalDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

// 53 week columns of seven days, Monday on top, ending with today's week;
// days after today are null.
export function graphColumns(today: string): (string | null)[][] {
  const start = graphStart(parseDay(today));
  return Array.from({ length: GRAPH_WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, row) => {
      const date = dayText(addDays(start, week * 7 + row));
      return date <= today ? date : null;
    }),
  );
}

// A month's name above the first column that starts in it.
export function monthLabels(columns: (string | null)[][]): { column: number; label: string }[] {
  const out: { column: number; label: string }[] = [];
  columns.forEach((days, column) => {
    const first = days[0];
    if (!first) return;
    const month = Number(first.slice(5, 7));
    const prev = column > 0 ? columns[column - 1][0] : null;
    if (column === 0 ? Number(first.slice(8, 10)) <= 7 : prev !== null && Number(prev.slice(5, 7)) !== month) out.push({ column, label: MONTHS[month - 1] });
  });
  return out;
}

// Every routine's days summed the way one routine's are.
export function aggregateDays(routines: RoutineSummary[]): GraphDay[] {
  const byDate = new Map<string, { ok: number; failed: number; missed: number }>();
  for (const r of routines) {
    for (const d of r.days) {
      const c = byDate.get(d.date) ?? { ok: 0, failed: 0, missed: 0 };
      c.ok += d.ok;
      c.failed += d.failed;
      c.missed += d.missed;
      byDate.set(d.date, c);
    }
  }
  const busiest = Math.max(1, ...[...byDate.values()].map((c) => c.ok));
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, c]) => {
      const state = c.failed ? 'failed' : c.ok ? 'ok' : 'missed';
      return { date, state, ...c, level: state === 'ok' ? Math.max(1, Math.ceil((4 * c.ok) / busiest)) : 0 };
    });
}

export function longDay(date: string): string {
  const d = parseDay(date);
  return `${WEEKDAYS[weekdayOf(d)]} ${d.day} ${MONTHS[d.month - 1]} ${d.year}`;
}

// What a cell says: `Mon 26 Oct 2026: 2 ok, 1 failed`.
export function dayLabel(date: string, day: GraphDay | undefined): string {
  if (!day) return `${longDay(date)}: nothing`;
  const parts = [day.ok && `${day.ok} ok`, day.failed && `${day.failed} failed`, day.missed && `${day.missed} missed`].filter(Boolean);
  return `${longDay(date)}: ${parts.join(', ')}`;
}

export interface DayRun {
  routine: RoutineSummary;
  run: Run;
}

// The runs of a day, each on its routine's local day, oldest first.
export function runsOn(routines: RoutineSummary[], date: string): DayRun[] {
  const out: DayRun[] = [];
  for (const routine of routines) {
    for (const run of routine.runs) {
      const when = run.status === 'expired' ? (run.slot ?? run.at) : run.at;
      if (localDay(Date.parse(when), routine.timezone) === date) out.push({ routine, run });
    }
  }
  return out.sort((a, b) => Date.parse(a.run.at) - Date.parse(b.run.at));
}

