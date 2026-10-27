import type { RoutineSummary, Run, RunStatus } from './types';

// The Routines view's pure parts (#0120): labels, tones and durations.

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

export function newestFirst(runs: Run[]): Run[] {
  return [...runs].reverse();
}

// The first error, else the first warning — the one line a row shows.
export function firstProblem(routine: RoutineSummary): string | null {
  const p = routine.problems.find((x) => x.level === 'error') ?? routine.problems[0];
  return p ? `${p.file}: ${p.message}` : null;
}
