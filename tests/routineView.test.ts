import { describe, expect, it } from 'vitest';
import { firstProblem, runDuration, runTone, stateLabel } from '../src/routines';
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
