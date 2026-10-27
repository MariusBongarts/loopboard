import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from '../server/cli';
import { dueAll, evaluate, finishRun, RoutineRefusal, startRun } from '../server/dispatch';
import { harnessesUnder, harnessFor, readRoutine } from '../server/routines';
import { parseRuns } from '../server/runs';

let tmp: string;
let repo: string;
const t = (iso: string) => Date.parse(iso);
const HOST = 'studio';

async function routine(slug: string, frontmatter: string, runs?: string): Promise<string> {
  const dir = join(repo, '.agents', 'scheduled', slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'routine.md'), `---\n${frontmatter.trim()}\n---\n\nDo the thing.\n`);
  if (runs !== undefined) await writeFile(join(dir, 'runs.md'), runs);
  return dir;
}

const runsOf = async (dir: string) => parseRuns(await readFile(join(dir, 'runs.md'), 'utf8')).runs;

async function run(...argv: string[]): Promise<{ code: number; out: string; err: string }> {
  const out = vi.spyOn(console, 'log').mockImplementation(() => {});
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const code = await main(argv);
    const text = (calls: unknown[][]) => calls.map((c) => c.join(' ')).join('\n');
    return { code, out: text(out.mock.calls), err: text(err.mock.calls) };
  } finally {
    out.mockRestore();
    err.mockRestore();
  }
}

beforeEach(async () => {
  tmp = await realpath(await mkdtemp(join(tmpdir(), 'loopboard-dispatch-')));
  repo = join(tmp, 'shop');
  await mkdir(join(repo, '.agents', 'issues'), { recursive: true });
  vi.stubEnv('LOOPBOARD_CONFIG_DIR', join(tmp, 'config'));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(tmp, { recursive: true, force: true });
});

const WEEKDAYS = 'title: Morning brief\nschedule: "30 7 * * 1-5"\ntimezone: Europe/Berlin';

describe('start (#0116)', () => {
  it('records a running entry with the slot it is for, under a header', async () => {
    const dir = await routine('brief', WEEKDAYS);
    const started = await startRun(dir, t('2026-10-27T06:30:04Z'), { host: HOST });
    expect(started).toMatchObject({ kind: 'started', missed: 0, aborted: null, run: { status: 'running', started: '2026-10-27T07:30:04+01:00', slot: '2026-10-27T07:30:00+01:00', host: HOST } });
    expect(await readFile(join(dir, 'runs.md'), 'utf8')).toBe(`# Runs: Morning brief

Written by \`loopboard routines\`, newest last. A later entry with the same
\`started\` replaces the earlier one. Don't edit by hand.

## 2026-10-27 07:30 · running
- started: 2026-10-27T07:30:04+01:00
- slot: 2026-10-27T07:30:00+01:00
- host: studio
`);
  });

  it('starts a manual run without a slot when nothing is due', async () => {
    const dir = await routine('brief', WEEKDAYS);
    await startRun(dir, t('2026-10-27T06:30:04Z'), { host: HOST });
    await finishRun(dir, 'ok', 'Done.', t('2026-10-27T06:40:00Z'));
    const manual = await startRun(dir, t('2026-10-27T10:00:00Z'), { host: HOST });
    expect(manual.run.slot).toBeUndefined();
  });

  it('refuses while a run is younger than its timeout, and aborts an older one', async () => {
    const dir = await routine('brief', `${WEEKDAYS}\ntimeout: 1h`);
    await startRun(dir, t('2026-10-27T06:30:04Z'), { host: HOST });
    await expect(startRun(dir, t('2026-10-27T07:00:00Z'), { host: 'laptop' })).rejects.toThrow(
      new RoutineRefusal('brief is running since today 07:30 on studio; its timeout is 1h.'),
    );
    const again = await startRun(dir, t('2026-10-27T08:00:00Z'), { host: 'laptop' });
    expect(again.aborted?.started).toBe('2026-10-27T07:30:04+01:00');
    const runs = await runsOf(dir);
    expect(runs.map((r) => [r.status, r.host])).toEqual([['aborted', HOST], ['running', 'laptop']]);
    expect(runs[0].note).toBe('No finish within 1h; marked aborted when the routine was checked again.');
  });

  it('records one run when two start at once', async () => {
    const dir = await routine('brief', WEEKDAYS);
    const results = await Promise.allSettled([startRun(dir, t('2026-10-27T06:30:04Z'), { host: HOST }), startRun(dir, t('2026-10-27T06:30:05Z'), { host: HOST })]);
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect((await runsOf(dir)).length).toBe(1);
    expect(existsSync(join(dir, 'runs.md.lock'))).toBe(false);
  });

  it('refuses a paused, pinned or invalid routine', async () => {
    await expect(startRun(await routine('paused', `${WEEKDAYS}\nenabled: false`), Date.now(), { host: HOST })).rejects.toThrow('paused is paused');
    await expect(startRun(await routine('pinned', `${WEEKDAYS}\nhost: Laptop.local`), Date.now(), { host: HOST })).rejects.toThrow('pinned runs on Laptop.local only; this machine is studio.');
    await expect(startRun(await routine('broken', 'schedule: "61 * * * *"'), Date.now(), { host: HOST })).rejects.toThrow('broken is invalid');
  });

  it('writes nothing with --dry-run', async () => {
    const dir = await routine('brief', WEEKDAYS);
    const started = await startRun(dir, t('2026-10-27T06:30:04Z'), { host: HOST, dryRun: true });
    expect(started.run.status).toBe('running');
    expect(existsSync(join(dir, 'runs.md'))).toBe(false);
  });
});

describe('finish (#0116)', () => {
  it('closes the open run with its note as a block quote', async () => {
    const dir = await routine('brief', WEEKDAYS);
    await startRun(dir, t('2026-10-27T06:30:04Z'), { host: HOST });
    const done = await finishRun(dir, 'failed', 'The mail server timed out.\n## Not a heading\n\nNext run: retry.', t('2026-10-27T06:41:15Z'));
    expect(done.switchedOff).toBe(false);
    const text = await readFile(join(dir, 'runs.md'), 'utf8');
    expect(text).toContain(`## 2026-10-27 07:30 · failed
- started: 2026-10-27T07:30:04+01:00
- finished: 2026-10-27T07:41:15+01:00
- slot: 2026-10-27T07:30:00+01:00
- host: studio

> The mail server timed out.
> ## Not a heading
>
> Next run: retry.
`);
    const [only] = await runsOf(dir);
    expect(only).toMatchObject({ status: 'failed', finished: '2026-10-27T07:41:15+01:00', note: 'The mail server timed out.\n## Not a heading\n\nNext run: retry.' });
  });

  it('refuses without an open run or a note, and closes a run that reports after its timeout', async () => {
    const dir = await routine('brief', `${WEEKDAYS}\ntimeout: 30m`);
    await expect(finishRun(dir, 'ok', 'Done.', Date.now())).rejects.toThrow('brief has no open run');
    await startRun(dir, t('2026-10-27T06:30:04Z'), { host: HOST });
    await expect(finishRun(dir, 'ok', '  ', Date.now())).rejects.toThrow('A run ends with a short note');
    await startRun(dir, t('2026-10-27T07:30:00Z'), { host: HOST }); // aborts the first, starts a manual run
    await finishRun(dir, 'ok', 'Late but done.', t('2026-10-27T07:35:00Z'));
    expect((await runsOf(dir)).map((r) => r.status)).toEqual(['aborted', 'ok']);
    await expect(finishRun(dir, 'ok', 'Again.', Date.now())).rejects.toThrow('brief has no open run');
  });

  it('switches a one-time routine off and leaves the rest of routine.md alone', async () => {
    const dir = await routine('reminder', 'title: Call the bank # by noon\nat: 2026-11-03 09:00\ntimezone: Europe/Berlin\ncreated: 2026-10-27');
    await startRun(dir, t('2026-11-03T08:05:00Z'), { host: HOST });
    const done = await finishRun(dir, 'ok', 'Reminded.', t('2026-11-03T08:06:00Z'));
    expect(done.switchedOff).toBe(true);
    expect(await readFile(join(dir, 'routine.md'), 'utf8')).toBe(
      '---\ntitle: Call the bank # by noon\nat: 2026-11-03 09:00\ntimezone: Europe/Berlin\nenabled: false\ncreated: 2026-10-27\n---\n\nDo the thing.\n',
    );
    expect(evaluate(readRoutine(dir), t('2026-11-04T00:00:00Z'), HOST).state).toBe('paused');
  });
});

describe('loopboard routines start and finish (#0116)', () => {
  it('starts by slug or folder, prints the finish command, and finishes with a note', async () => {
    const dir = await routine('brief', 'schedule: "@hourly"');
    const started = await run('routines', 'start', 'brief', '--path', repo);
    expect(started.code).toBe(0);
    expect(started.out).toMatch(/^started brief — slot \S+/);
    expect(started.out).toContain(`  brief:  loopboard routines prompt ${dir}`);
    expect(started.out).toContain(`  finish: loopboard routines finish ${dir} --status ok --note "…"`);
    const refused = await run('routines', 'start', dir);
    expect(refused.code).toBe(1);
    expect(refused.err).toMatch(/^brief is running since today \d\d:\d\d on \S+; its timeout is 2h\.$/);
    expect((await run('routines', 'finish', dir, '--status', 'done', '--note', 'x')).err).toBe('--status is ok or failed.');
    expect((await run('routines', 'finish', dir, '--status', 'ok')).err).toContain('--note "…" says what the run did');
    const finished = await run('routines', 'finish', join(dir, 'routine.md'), '--status', 'ok', '--note', 'All good.');
    expect(finished).toMatchObject({ code: 0, out: 'finished brief: ok' });
    expect((await runsOf(dir)).at(-1)).toMatchObject({ status: 'ok', note: 'All good.' });
  });

  it('prints the run as JSON and names what is no routine', async () => {
    await routine('brief', 'schedule: "@hourly"');
    const json = JSON.parse((await run('routines', 'start', 'brief', '--path', repo, '--json', '--dry-run')).out);
    expect(json).toMatchObject({ version: 1, action: 'started', dryRun: true, run: { status: 'running' } });
    expect((await run('routines', 'start', 'nope', '--path', repo)).err).toBe(`No routine "nope" in ${join(repo, '.agents', 'scheduled')}/.`);
    expect((await run('routines', 'start', repo)).err).toBe(`${repo} is no routine folder (<root>/scheduled/<slug>/).`);
    expect((await run('routines', 'start', 'brief', '--under', repo)).err).toBe('Unknown flag --under: `loopboard routines start` takes --path, --json, --dry-run.');
  });
});

const here = () => [harnessFor(repo, join(repo, '.agents'))];

describe('when a routine is due (#0117)', () => {
  it('is due at its latest slot until a run handles it', async () => {
    const dir = await routine('brief', WEEKDAYS);
    expect(evaluate(readRoutine(dir), t('2026-10-27T06:00:00Z'), HOST)).toMatchObject({ state: 'due', slot: t('2026-10-26T06:30:00Z') });
    await startRun(dir, t('2026-10-27T06:31:00Z'), { host: HOST });
    await finishRun(dir, 'ok', 'Done.', t('2026-10-27T06:35:00Z'));
    expect(evaluate(readRoutine(dir), t('2026-10-27T12:00:00Z'), HOST).state).toBe('idle');
    expect(evaluate(readRoutine(dir), t('2026-10-28T06:30:00Z'), HOST)).toMatchObject({ state: 'due', slot: t('2026-10-28T06:30:00Z') });
  });

  it('counts no slot before the day it was created', async () => {
    const dir = await routine('weekly', 'schedule: "30 7 * * 1"\ntimezone: Europe/Berlin\ncreated: 2026-10-28');
    expect(evaluate(readRoutine(dir), t('2026-10-29T12:00:00Z'), HOST).state).toBe('idle');
    expect(evaluate(readRoutine(dir), t('2026-11-02T06:31:00Z'), HOST).state).toBe('due');
    const today = await routine('today', 'schedule: "30 7 * * *"\ntimezone: Europe/Berlin\ncreated: 2026-10-28');
    expect(evaluate(readRoutine(today), t('2026-10-28T12:00:00Z'), HOST)).toMatchObject({ state: 'due', missed: [] });
  });

  it('catches up once and records the slots it covers as missed', async () => {
    const dir = await routine('hourly', 'schedule: "0 * * * *"\ntimezone: UTC', `# Runs: hourly

## 2026-10-27 08:00 · ok
- started: 2026-10-27T08:00:05+00:00
- finished: 2026-10-27T08:01:00+00:00
- slot: 2026-10-27T08:00:00+00:00
- host: studio

> Fine.
`);
    const report = await dueAll(here(), t('2026-10-27T12:10:00Z'), { host: HOST });
    expect(report.run).toEqual([expect.objectContaining({ slug: 'hourly', slot: '2026-10-27T12:00:00+00:00', missed: 3 })]);
    await startRun(dir, t('2026-10-27T12:10:05Z'), { host: HOST });
    const runs = await runsOf(dir);
    expect(runs.map((r) => r.status)).toEqual(['ok', 'missed', 'running']);
    expect(runs[1]).toMatchObject({ from: '2026-10-27T09:00:00+00:00', to: '2026-10-27T11:00:00+00:00', slots: 3, note: "3 earlier slots weren't run; the next run covers them." });
  });

  it('records a slot older than expires-after as expired instead of running it', async () => {
    const dir = await routine('brief', `${WEEKDAYS}\nexpires-after: 6h`);
    const report = await dueAll(here(), t('2026-10-27T14:02:00Z'), { host: HOST });
    expect(report.run).toEqual([]);
    expect(report.expired).toEqual([expect.objectContaining({ slug: 'brief', slot: '2026-10-27T07:30:00+01:00', late: '7h 32m' })]);
    expect((await runsOf(dir)).at(-1)).toMatchObject({ status: 'expired', recorded: '2026-10-27T15:02:00+01:00', note: '7h 32m after the slot; expires-after is 6h.' });
    expect((await dueAll(here(), t('2026-10-27T15:00:00Z'), { host: HOST })).expired).toEqual([]);
  });

  it('switches an expired one-time routine off', async () => {
    const dir = await routine('reminder', 'at: 2026-11-03 09:00\ntimezone: UTC\nexpires-after: 1h');
    await dueAll(here(), t('2026-11-03T12:00:00Z'), { host: HOST });
    expect(await readFile(join(dir, 'routine.md'), 'utf8')).toContain('enabled: false');
  });

  it('leaves a run younger than its timeout alone and aborts an older one', async () => {
    const dir = await routine('brief', `${WEEKDAYS}\ntimeout: 1h`);
    await startRun(dir, t('2026-10-27T06:30:04Z'), { host: HOST });
    const young = await dueAll(here(), t('2026-10-27T07:00:00Z'), { host: HOST });
    expect(young.running).toEqual([expect.objectContaining({ slug: 'brief', started: '2026-10-27T07:30:04+01:00', host: HOST })]);
    expect(young.run).toEqual([]);
    const old = await dueAll(here(), t('2026-10-28T06:31:00Z'), { host: HOST });
    expect(old.aborted).toEqual([expect.objectContaining({ slug: 'brief', started: '2026-10-27T07:30:04+01:00' })]);
    expect(old.run).toEqual([expect.objectContaining({ slug: 'brief', slot: '2026-10-28T07:30:00+01:00', missed: 0 })]);
    expect((await runsOf(dir)).map((r) => r.status)).toEqual(['aborted']);
  });

  it('skips paused routines and routines pinned to another host, and reports invalid ones', async () => {
    await routine('paused', `${WEEKDAYS}\nenabled: false`);
    await routine('pinned', `${WEEKDAYS}\nhost: laptop`);
    await routine('broken', 'schedule: "61 * * * *"');
    const report = await dueAll(here(), t('2026-10-27T07:00:00Z'), { host: HOST });
    expect(report.run).toEqual([]);
    expect(report.problems).toEqual([expect.objectContaining({ slug: 'broken', problems: [expect.objectContaining({ message: 'schedule "61 * * * *": minute "61" is out of range (0–59)' })] })]);
    const onLaptop = await dueAll(here(), t('2026-10-27T07:00:00Z'), { host: 'laptop' });
    expect(onLaptop.run.map((r) => r.slug)).toEqual(['pinned']);
  });

  it('files issues and covers every harness under a folder; --dry-run writes nothing', async () => {
    const company = join(repo, 'company');
    await mkdir(join(company, '.agents', 'issues'), { recursive: true });
    await mkdir(join(company, '.agents', 'scheduled', 'books'), { recursive: true });
    await writeFile(join(company, '.agents', 'scheduled', 'books', 'routine.md'), '---\nschedule: "0 6 1 * *"\ntimezone: UTC\ncreates: issue\nperiod: month\n---\n\nBooks.\n');
    await routine('brief', WEEKDAYS);
    const dry = await dueAll(harnessesUnder(repo), t('2026-11-02T07:00:00Z'), { host: HOST, dryRun: true });
    expect(dry).toMatchObject({ dryRun: true, run: [{ slug: 'brief', harness: { id: 'shop' } }], filed: [{ slug: 'books', status: 'ok', harness: { id: 'company' }, issue: { id: '0001', existing: false } }] });
    expect(existsSync(join(company, '.agents', 'scheduled', 'books', 'runs.md'))).toBe(false);
    const real = await dueAll(harnessesUnder(repo), t('2026-11-02T07:00:00Z'), { host: HOST });
    expect(real.filed[0]).toMatchObject({ note: 'Filed #0001 books 2026-11 (issues/0001-books-2026-11.md).' });
    expect(existsSync(join(company, '.agents', 'issues', '0001-books-2026-11.md'))).toBe(true);
    expect((await dueAll(harnessesUnder(repo), t('2026-11-02T08:00:00Z'), { host: HOST })).filed).toEqual([]);
  });
});

describe('loopboard routines due (#0117)', () => {
  it('prints what is due and the JSON shape', async () => {
    await routine('hourly', 'schedule: "@hourly"');
    await routine('broken', 'schedule: "61 * * * *"');
    const text = await run('routines', 'due', repo, '--dry-run');
    expect(text.code).toBe(0);
    expect(text.out).toContain('Dry run — nothing was written.');
    expect(text.out).toMatch(/run\s+shop\/hourly\s+slot (today|yesterday) \d\d:00/);
    expect(text.out).toMatch(/invalid\s+shop\/broken\s+schedule "61 \* \* \* \*"/);
    expect(text.out).toContain('Run each, one after another');
    const json = JSON.parse((await run('routines', 'due', repo, '--json')).out);
    expect(Object.keys(json)).toEqual(['version', 'host', 'now', 'dryRun', 'run', 'filed', 'expired', 'aborted', 'running', 'problems']);
    expect(json.run[0]).toEqual({ harness: { id: 'shop', name: 'shop', path: repo }, slug: 'hourly', dir: join(repo, '.agents', 'scheduled', 'hourly'), title: 'hourly', slot: expect.any(String), missed: 0 });
  });

  it('says when nothing is due', async () => {
    await routine('paused', 'schedule: "@hourly"\nenabled: false');
    expect((await run('routines', 'due', repo)).out).toBe('Nothing is due.');
  });
});

