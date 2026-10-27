import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from '../server/cli';
import { startRun } from '../server/dispatch';
import { isoWeek, periodLabel, previousLabel } from '../server/recurrence';
import { parseRuns } from '../server/runs';

const d = (text: string) => {
  const [year, month, day] = text.split('-').map(Number);
  return { year, month, day };
};
const t = (iso: string) => Date.parse(iso);

describe('periods (#0118)', () => {
  it.each([
    ['day', '2028-02-29', '2028-02-29', '2028-02-28'],
    ['day', '2026-03-01', '2026-03-01', '2026-02-28'],
    ['week', '2026-12-31', '2026-W53', '2026-W52'],
    ['week', '2027-01-01', '2026-W53', '2026-W52'],
    ['week', '2027-01-04', '2027-W01', '2026-W53'],
    ['week', '2025-12-29', '2026-W01', '2025-W52'],
    ['month', '2026-11-03', '2026-11', '2026-10'],
    ['month', '2027-01-01', '2027-01', '2026-12'],
    ['month', '2027-02-28', '2027-02', '2027-01'],
    ['quarter', '2026-10-01', '2026-Q4', '2026-Q3'],
    ['quarter', '2027-01-01', '2027-Q1', '2026-Q4'],
    ['quarter', '2026-06-30', '2026-Q2', '2026-Q1'],
    ['year', '2027-01-01', '2027', '2026'],
  ] as const)('%s of %s is %s, the one before %s', (period, date, label, previous) => {
    expect(periodLabel(period, d(date))).toBe(label);
    expect(previousLabel(period, d(date))).toBe(previous);
  });

  it('numbers ISO weeks from the week with the year’s first Thursday', () => {
    expect(isoWeek(d('2026-01-01'))).toEqual({ year: 2026, week: 1 });
    expect(isoWeek(d('2021-01-03'))).toEqual({ year: 2020, week: 53 });
  });
});

let tmp: string;
let repo: string;
let root: string;

async function routine(slug: string, frontmatter: string, body: string): Promise<string> {
  const dir = join(root, 'scheduled', slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'routine.md'), `---\n${frontmatter.trim()}\n---\n\n${body}`);
  return dir;
}

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
  tmp = await realpath(await mkdtemp(join(tmpdir(), 'loopboard-recur-')));
  repo = join(tmp, 'books');
  root = join(repo, '.agents');
  await mkdir(join(root, 'issues', '_archive'), { recursive: true });
  await mkdir(join(root, 'projects', '03-finances'), { recursive: true });
  await writeFile(join(root, 'issues', '0001-first.md'), '---\nid: 0001\ntitle: First\nstatus: todo\n---\n');
  vi.stubEnv('LOOPBOARD_CONFIG_DIR', join(tmp, 'config'));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(tmp, { recursive: true, force: true });
});

const MONTHLY = `title: Monthly books
schedule: "0 6 1 * *"
timezone: Europe/Berlin
creates: issue
period: month
issue-title: "Books for {previous}"
issue-assignee: human
issue-labels: [finance, recurring]
issue-project: 03-finances
issue-due-after: 9d`;

describe('filing the period’s issue (#0118)', () => {
  it('files the issue with its fields, due day and recurrence, and records an ok run', async () => {
    const dir = await routine('monthly-books', MONTHLY, 'Send the {previous} books to the accountant by {date}.\n');
    const filed = await startRun(dir, t('2027-01-01T05:00:30Z'), { host: 'studio' });
    expect(filed).toMatchObject({ kind: 'filed', slot: t('2027-01-01T05:00:00Z'), issue: { id: '0002', period: '2027-01', existing: false, file: 'issues/0002-books-for-2026-12.md' } });
    expect(await readFile(join(root, 'issues', '0002-books-for-2026-12.md'), 'utf8')).toBe(`---
id: 0002
title: Books for 2026-12
category: task
status: todo
assignee: human
project: 03-finances
labels: [finance, recurring]
due: 2027-01-10
recurrence: monthly-books@2027-01
created: 2027-01-01
---

Send the 2026-12 books to the accountant by 2027-01-01.
`);
    const runs = parseRuns(await readFile(join(dir, 'runs.md'), 'utf8')).runs;
    expect(runs).toEqual([
      expect.objectContaining({ status: 'ok', slot: '2027-01-01T06:00:00+01:00', note: 'Filed #0002 Books for 2026-12 (issues/0002-books-for-2026-12.md).' }),
    ]);
  });

  it('files nothing twice, not after the issue was archived either', async () => {
    const dir = await routine('monthly-books', MONTHLY, 'Books.\n');
    await startRun(dir, t('2026-11-01T05:00:30Z'), { host: 'studio' });
    const again = await startRun(dir, t('2026-11-01T09:00:00Z'), { host: 'studio' });
    expect(again).toMatchObject({ kind: 'filed', issue: { id: '0002', existing: true } });
    await rename(join(root, 'issues', '0002-books-for-2026-10.md'), join(root, 'issues', '_archive', '0002-books-for-2026-10.md'));
    const third = await startRun(dir, t('2026-11-15T09:00:00Z'), { host: 'studio' });
    expect(third).toMatchObject({ issue: { existing: true, file: 'issues/_archive/0002-books-for-2026-10.md' } });
    expect(third.run.note).toBe('#0002 for 2026-11 is there already (issues/_archive/0002-books-for-2026-10.md); nothing filed.');
    expect((await readdir(join(root, 'issues'))).filter((f) => f.endsWith('.md'))).toEqual(['0001-first.md']);
  });

  it('files the latest period after a gap and records the missed ones, never back-filling', async () => {
    const dir = await routine('monthly-books', `${MONTHLY}\ncreated: 2026-09-15`, 'Books.\n');
    await startRun(dir, t('2026-10-01T05:00:30Z'), { host: 'studio' });
    const later = await startRun(dir, t('2027-01-03T12:00:00Z'), { host: 'studio' });
    expect(later).toMatchObject({ missed: 2, issue: { period: '2027-01' } });
    const runs = parseRuns(await readFile(join(dir, 'runs.md'), 'utf8')).runs;
    expect(runs.map((r) => r.status)).toEqual(['ok', 'missed', 'ok']);
    expect(runs[1]).toMatchObject({ from: '2026-11-01T06:00:00+01:00', to: '2026-12-01T06:00:00+01:00', slots: 2 });
    expect((await readdir(join(root, 'issues'))).filter((f) => f.endsWith('.md'))).toEqual(['0001-first.md', '0002-books-for-2026-09.md', '0003-books-for-2026-12.md']);
  });

  it('files on the last day of February and on 29 February', async () => {
    const dir = await routine('closing', 'schedule: "0 18 L * *"\ntimezone: UTC\ncreates: issue\nperiod: month\nissue-title: "Close {period}"', 'Close it.\n');
    const feb = await startRun(dir, t('2028-02-29T18:00:10Z'), { host: 'studio' });
    expect(feb).toMatchObject({ slot: t('2028-02-29T18:00:00Z'), issue: { title: 'Close 2028-02' } });
    const leap = await routine('leap', 'schedule: "0 9 29 2 *"\ntimezone: UTC\ncreates: issue\nperiod: day', 'Leap.\n');
    expect(await startRun(leap, t('2028-02-29T09:00:05Z'), { host: 'studio' })).toMatchObject({ issue: { title: 'leap 2028-02-29', recurrence: 'leap@2028-02-29' } });
  });

  it('records a failed run when the issue can’t be filed', async () => {
    const dir = await routine('broken', 'schedule: "@monthly"\ntimezone: UTC\ncreates: issue\nperiod: month\nissue-project: 99-gone', 'x\n');
    const r = await run('routines', 'start', dir);
    expect(r.code).toBe(1);
    expect(r.err).toBe('broken: Filing the issue failed: unknown project: 99-gone');
    expect(parseRuns(await readFile(join(dir, 'runs.md'), 'utf8')).runs[0]).toMatchObject({ status: 'failed' });
  });

  it('names the issue it would file with --dry-run and writes nothing', async () => {
    const dir = await routine('quarterly', 'schedule: "0 6 1 1,4,7,10 *"\ntimezone: UTC\ncreates: issue\nperiod: quarter\nissue-title: "VAT {previous}"', 'x\n');
    const r = await run('routines', 'start', dir, '--dry-run');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^would file #0002 VAT \d{4}-Q\d for quarterly — slot \S+$/);
    expect(await readdir(dir)).toEqual(['routine.md']);
  });
});

describe('check finds two issues for one period (#0118)', () => {
  it('reports the duplicate recurrence and fails', async () => {
    await writeFile(join(root, 'issues', '0002-books.md'), '---\nid: 0002\ntitle: Books\nrecurrence: monthly-books@2026-11\n---\n');
    await writeFile(join(root, 'issues', '_archive', '0003-books.md'), '---\nid: 0003\ntitle: Books\nrecurrence: "monthly-books@2026-11"\n---\n');
    await writeFile(join(root, 'issues', '0004-other.md'), '---\nid: 0004\ntitle: Other\nrecurrence: monthly-books@2026-12\n---\n');
    const r = await run('check', repo);
    expect(r.code).toBe(1);
    expect(r.out).toContain('✗ duplicate recurrence monthly-books@2026-11:\n    issues/0002-books.md\n    issues/_archive/0003-books.md');
    expect(r.out).not.toContain('2026-12:');
  });
});
