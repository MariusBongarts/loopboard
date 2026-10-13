import { describe, expect, it } from 'vitest';
import { onLiveEvent, singleFlight, type LiveEvent, type LiveState } from '../src/live';

// Feeds a stream of events through the reducer; counts the refetches.
function run(events: LiveEvent[], from: LiveState = 'connecting') {
  let state = from;
  let refetches = 0;
  for (const event of events) {
    const next = onLiveEvent(event, state);
    state = next.state;
    if (next.refetch) refetches++;
  }
  return { state, refetches };
}

describe('onLiveEvent', () => {
  it('goes live on ready and refetches on every change', () => {
    expect(run(['ready'])).toEqual({ state: 'live', refetches: 0 });
    expect(run(['ready', 'change', 'change'])).toEqual({ state: 'live', refetches: 2 });
  });

  it('catches up after a dropped connection', () => {
    expect(run(['ready', 'error'])).toEqual({ state: 'offline', refetches: 0 });
    expect(run(['ready', 'error', 'ready'])).toEqual({ state: 'live', refetches: 1 });
  });

  // #0072
  it('stops saying live when the watcher dies and refetches once', () => {
    expect(run(['ready', 'stale'])).toEqual({ state: 'stale', refetches: 1 });
    expect(run(['ready', 'stale', 'stale'])).toEqual({ state: 'stale', refetches: 1 });
  });

  it('catches up when the watcher is back', () => {
    expect(run(['ready', 'stale', 'ready'])).toEqual({ state: 'live', refetches: 2 });
  });

  it('is not live when the first thing it hears is stale', () => {
    expect(run(['stale'])).toEqual({ state: 'stale', refetches: 1 });
    expect(run(['ready', 'error', 'stale'])).toEqual({ state: 'stale', refetches: 1 });
  });
});

// "Refresh" clicked several times in a row (#0072).
describe('singleFlight', () => {
  it('shares one run between calls made while it runs, then runs again', async () => {
    let runs = 0;
    let finish: () => void = () => {};
    const refresh = singleFlight(() => {
      runs++;
      return new Promise<void>((resolve) => (finish = resolve));
    });

    const calls = [refresh(), refresh(), refresh()];
    expect(runs).toBe(1);
    finish();
    await Promise.all(calls);

    const later = refresh();
    expect(runs).toBe(2);
    finish();
    await later;
  });

  it('runs again after a run that failed', async () => {
    let runs = 0;
    const refresh = singleFlight(async () => {
      if (++runs === 1) throw new Error('offline');
    });

    await expect(refresh()).rejects.toThrow('offline');
    await refresh();
    expect(runs).toBe(2);
  });
});
