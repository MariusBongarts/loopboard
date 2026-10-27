import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { graphStart } from '../shared/cron';
import { graphDays } from '../server/graph';
import { readRoutine } from '../server/routines';

let tmp: string;
const t = (iso: string) => Date.parse(iso);

async function routine(frontmatter: string, runs: string): Promise<string> {
  const dir = join(tmp, '.agents', 'scheduled', 'r');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'routine.md'), `---\n${frontmatter}\n---\n\nSteps.\n`);
  await writeFile(join(dir, 'runs.md'), runs);
  return dir;
}

const entry = (status: string, started: string, extra = '') => `## x · ${status}\n- ${status === 'expired' || status === 'missed' ? 'recorded' : 'started'}: ${started}\n${extra}\n`;

beforeEach(async () => {
  tmp = await realpath(await mkdtemp(join(tmpdir(), 'loopboard-graph-')));
  await mkdir(join(tmp, '.agents', 'issues'), { recursive: true });
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('the contribution graph’s days (#0121)', () => {
  it('opens on the Monday 52 weeks before this week', () => {
    expect(graphStart({ year: 2026, month: 10, day: 28 })).toEqual({ year: 2025, month: 10, day: 27 });
  });

  it('shades ok days by how busy they were, puts failures first and greys missed slots', async () => {
    const dir = await routine(
      'schedule: "0 * * * *"\ntimezone: UTC',
      [
        entry('ok', '2026-10-20T08:00:00+00:00'),
        entry('ok', '2026-10-21T08:00:00+00:00'),
        entry('ok', '2026-10-21T09:00:00+00:00'),
        entry('ok', '2026-10-21T10:00:00+00:00'),
        entry('ok', '2026-10-21T11:00:00+00:00'),
        entry('failed', '2026-10-22T08:00:00+00:00'),
        entry('ok', '2026-10-22T09:00:00+00:00'),
        entry('aborted', '2026-10-23T08:00:00+00:00'),
        entry('expired', '2026-10-24T15:00:00+00:00', '- slot: 2026-10-24T08:00:00+00:00'),
        entry('missed', '2026-10-27T12:00:00+00:00', '- from: 2026-10-25T23:00:00+00:00\n- to: 2026-10-26T01:00:00+00:00\n- slots: 3'),
        entry('running', '2026-10-27T12:00:05+00:00'),
      ].join('\n'),
    );
    const days = Object.fromEntries(graphDays(readRoutine(dir), t('2026-10-28T12:00:00Z')).map((d) => [d.date, d]));
    expect(days['2026-10-20']).toMatchObject({ state: 'ok', ok: 1, level: 1 });
    expect(days['2026-10-21']).toMatchObject({ state: 'ok', ok: 4, level: 4 });
    expect(days['2026-10-22']).toMatchObject({ state: 'failed', ok: 1, failed: 1, level: 0 });
    expect(days['2026-10-23']).toMatchObject({ state: 'failed' });
    expect(days['2026-10-24']).toMatchObject({ state: 'missed', missed: 1 });
    expect(days['2026-10-25']).toMatchObject({ state: 'missed', missed: 1 });
    expect(days['2026-10-26']).toMatchObject({ state: 'missed', missed: 2 });
    // The running day and today aren't missed; days before the first entry aren't either.
    expect(days['2026-10-27']).toMatchObject({ state: 'missed' });
    expect(days['2026-10-28']).toBeUndefined();
    expect(days['2026-10-19']).toBeUndefined();
  });

  it('greys past slots without any entry since the created day, only while enabled', async () => {
    const runs = entry('ok', '2026-10-26T07:30:00+00:00');
    const dir = await routine('schedule: "30 7 * * 1"\ntimezone: UTC\ncreated: 2026-10-01', runs);
    const days = graphDays(readRoutine(dir), t('2026-10-28T12:00:00Z'));
    expect(days.map((d) => [d.date, d.state])).toEqual([
      ['2026-10-05', 'missed'],
      ['2026-10-12', 'missed'],
      ['2026-10-19', 'missed'],
      ['2026-10-26', 'ok'],
    ]);
    const paused = await routine('schedule: "30 7 * * 1"\ntimezone: UTC\ncreated: 2026-10-01\nenabled: false', runs);
    expect(graphDays(readRoutine(paused), t('2026-10-28T12:00:00Z')).map((d) => d.date)).toEqual(['2026-10-26']);
  });

  it('counts days in the routine’s zone', async () => {
    const dir = await routine('schedule: "30 23 * * *"\ntimezone: Pacific/Auckland', entry('ok', '2026-10-26T23:30:00+13:00'));
    expect(graphDays(readRoutine(dir), t('2026-10-28T00:00:00Z')).map((d) => d.date)).toEqual(['2026-10-26', '2026-10-27']);
  });
});
