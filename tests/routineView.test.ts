import { describe, expect, it } from 'vitest';
import { aggregateDays, dayLabel, firstProblem, graphColumns, monthLabels, runDuration, runsOn, runTone, stateLabel } from '../src/routines';
import type { RoutineSummary } from '../src/types';

const base = { host: 'studio', problems: [] } as unknown as RoutineSummary;

describe('the Routines view’s labels (#0120)', () => {
  it('groups run states into the four tones the graph shares', () => {
    expect(['ok', 'failed', 'aborted', 'running', 'expired', 'missed'].map((s) => runTone(s as never))).toEqual(['ok', 'failed', 'failed', 'running', 'missed', 'missed']);
  });

  it('says what a routine’s state means, and nothing when it is idle', () => {
    expect(stateLabel({ ...base, state: 'pinned' })).toBe('On studio only');
    expect(stateLabel({ ...base, state: 'due' })).toBe('Due');
    expect(stateLabel({ ...base, state: 'idle' })).toBe('');
  });

  it('spells a run’s duration', () => {
    const run = (min: number) => ({ status: 'ok' as const, at: '', note: '', started: '2026-10-27T07:00:00Z', finished: new Date(Date.parse('2026-10-27T07:00:00Z') + min * 60000).toISOString() });
    expect(runDuration(run(0.2))).toBe('under a minute');
    expect(runDuration(run(12))).toBe('12 min');
    expect(runDuration(run(125))).toBe('2 h 5 min');
    expect(runDuration(run(120))).toBe('2 h');
    expect(runDuration({ status: 'running', at: '', note: '' })).toBe('');
  });

  it('shows the first error before any warning', () => {
    const problems = [
      { level: 'warning', file: 'routine.md', message: 'unknown field "x"' },
      { level: 'error', file: 'routine.md', message: 'has neither `schedule` nor `at`' },
    ];
    expect(firstProblem({ ...base, problems } as RoutineSummary)).toBe('routine.md: has neither `schedule` nor `at`');
    expect(firstProblem(base)).toBeNull();
  });
});

describe('the contribution graph’s layout (#0121)', () => {
  it('lays out 53 Monday-first weeks ending with today', () => {
    const cols = graphColumns('2026-10-28');
    expect(cols).toHaveLength(53);
    expect(cols[0][0]).toBe('2025-10-27');
    expect(cols[52]).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', null, null, null, null]);
  });

  it('labels a month above the first week that starts in it', () => {
    const labels = monthLabels(graphColumns('2026-10-28'));
    expect(labels[0]).toEqual({ column: 1, label: 'Nov' });
    expect(labels.find((l) => l.label === 'Jan')).toEqual({ column: 10, label: 'Jan' });
    expect(labels).toHaveLength(12);
  });

  it('sums every routine’s days, failures first, shades relative to the busiest day', () => {
    const r = (days: object[]) => ({ days }) as unknown as RoutineSummary;
    const sum = aggregateDays([
      r([{ date: '2026-10-20', state: 'ok', ok: 2, failed: 0, missed: 0, level: 4 }, { date: '2026-10-21', state: 'missed', ok: 0, failed: 0, missed: 1, level: 0 }]),
      r([{ date: '2026-10-20', state: 'ok', ok: 2, failed: 0, missed: 0, level: 4 }, { date: '2026-10-21', state: 'failed', ok: 0, failed: 1, missed: 0, level: 0 }, { date: '2026-10-22', state: 'ok', ok: 1, failed: 0, missed: 0, level: 4 }]),
    ]);
    expect(sum.map((d) => [d.date, d.state, d.level])).toEqual([['2026-10-20', 'ok', 4], ['2026-10-21', 'failed', 0], ['2026-10-22', 'ok', 1]]);
    expect(dayLabel('2026-10-21', sum[1])).toBe('Wed 21 Oct 2026: 1 failed, 1 missed');
    expect(dayLabel('2026-10-23', undefined)).toBe('Fri 23 Oct 2026: nothing');
  });

  it('lists a day’s runs on each routine’s own local day', () => {
    const auckland = { title: 'A', timezone: 'Pacific/Auckland', runs: [{ status: 'ok', at: '2026-10-26T11:30:00Z', note: '' }] } as unknown as RoutineSummary;
    const utc = { title: 'U', timezone: 'UTC', runs: [{ status: 'expired', at: '2026-10-27T15:00:00Z', slot: '2026-10-27T08:00:00Z', note: '' }] } as unknown as RoutineSummary;
    expect(runsOn([auckland, utc], '2026-10-27').map((d) => d.routine.title)).toEqual(['A', 'U']);
  });
});

