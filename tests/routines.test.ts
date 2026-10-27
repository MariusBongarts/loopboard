import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from '../server/cli';
import { summarizeRoutine } from '../server/dispatch';
import { harnessesUnder, readRoutine, readRoutines } from '../server/routines';
import { parseRuns } from '../server/runs';

let tmp: string;

async function harness(name: string, root = '.agents'): Promise<string> {
  const path = join(tmp, name);
  await mkdir(join(path, root, 'issues'), { recursive: true });
  return path;
}

async function routine(repo: string, slug: string, frontmatter: string, body = 'Do the thing.\n', runs?: string): Promise<string> {
  const dir = join(repo, '.agents', 'scheduled', slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'routine.md'), `---\n${frontmatter.trim()}\n---\n\n${body}`);
  if (runs !== undefined) await writeFile(join(dir, 'runs.md'), runs);
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
  tmp = await realpath(await mkdtemp(join(tmpdir(), 'loopboard-routines-')));
  vi.stubEnv('LOOPBOARD_CONFIG_DIR', join(tmp, 'config'));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(tmp, { recursive: true, force: true });
});

const RUNS = `# Runs: Weekly

Written by \`loopboard routines\`, newest last.

## 2026-10-26 07:30 · running
- started: 2026-10-26T07:30:04+01:00
- slot: 2026-10-26T07:30:00+01:00
- host: studio

## 2026-10-26 07:30 · ok
- started: 2026-10-26T07:30:04+01:00
- finished: 2026-10-26T07:41:15+01:00
- slot: 2026-10-26T07:30:00+01:00
- host: studio

> Wrote the report.
> ## Not a heading
> Next run: the baseline is set.

## 2026-10-27 15:02 · expired
- recorded: 2026-10-27T15:02:11+01:00
- slot: 2026-10-27T07:30:00+01:00

> Too late.

## 2026-10-28 · nonsense
- started: 2026-10-28T07:30:00+01:00
`;

describe('runs.md (#0114)', () => {
  it('ties the entries of one run by started and keeps the last', () => {
    const { runs, problems } = parseRuns(RUNS);
    expect(runs.map((r) => r.status)).toEqual(['ok', 'expired']);
    expect(runs[0]).toEqual({
      status: 'ok',
      at: '2026-10-26T07:30:04+01:00',
      started: '2026-10-26T07:30:04+01:00',
      finished: '2026-10-26T07:41:15+01:00',
      slot: '2026-10-26T07:30:00+01:00',
      host: 'studio',
      note: 'Wrote the report.\n## Not a heading\nNext run: the baseline is set.',
    });
    expect(runs[1]).toMatchObject({ status: 'expired', at: '2026-10-27T15:02:11+01:00', note: 'Too late.' });
    expect(problems).toEqual([{ line: 26, message: 'unknown status "nonsense"' }]);
  });

  it('skips an entry without its time', () => {
    const { runs, problems } = parseRuns('## 2026-10-26 07:30 · ok\n- finished: 2026-10-26T07:41:15+01:00\n');
    expect(runs).toEqual([]);
    expect(problems).toEqual([{ line: 1, message: 'a ok entry needs `started:` as an ISO time' }]);
  });
});

describe('reading routines (#0114)', () => {
  it('reads every field from its raw line, an unquoted cron included', async () => {
    const repo = await harness('shop');
    const dir = await routine(
      repo,
      'mail-check',
      `title: "Mail check: inbox"
schedule: */15 * * * 1-5
timezone: Europe/Berlin
enabled: false
expires-after: 1h30m
timeout: 30m
host: studio
writes-to:
  - leben
  - steuern
created: 2026-10-27`,
      'Check the inbox.\n',
      RUNS,
    );
    const r = readRoutine(dir, Date.parse('2026-10-28T12:00:00Z'));
    expect(r).toMatchObject({
      slug: 'mail-check',
      title: 'Mail check: inbox',
      enabled: false,
      schedule: '*/15 * * * 1-5',
      at: null,
      timezone: 'Europe/Berlin',
      expiresAfter: '1h30m',
      timeout: '30m',
      host: 'studio',
      writesTo: ['leben', 'steuern'],
      created: '2026-10-27',
      creates: null,
      body: 'Check the inbox.',
    });
    expect(r.problems).toEqual([{ level: 'warning', file: 'runs.md', message: 'line 26: unknown status "nonsense"' }]);
    expect(summarizeRoutine(r, Date.parse('2026-10-28T12:00:00Z'))).toMatchObject({ state: 'paused', words: 'Every 15 minutes on weekdays', next: null });
  });

  it('defaults the title, the zone, the timeout and the issue fields', async () => {
    const repo = await harness('books');
    const dir = await routine(repo, 'monthly-books', 'schedule: "0 6 1 * *"\ncreates: issue\nperiod: month');
    const r = readRoutine(dir);
    expect(r.title).toBe('monthly-books');
    expect(r.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(r.timeout).toBe('2h');
    expect(r.creates).toEqual({ period: 'month', title: 'monthly-books {period}', category: 'task', status: 'todo', assignee: 'agent', labels: [], project: null, dueAfter: null });
  });

  it('gives the next slot in the routine’s zone', async () => {
    const repo = await harness('site');
    const dir = await routine(repo, 'brief', 'schedule: "30 7 * * 1-5"\ntimezone: Europe/Berlin');
    const summary = summarizeRoutine(readRoutine(dir), Date.parse('2026-10-30T12:00:00Z'));
    expect(summary).toMatchObject({ state: 'due', words: 'Weekdays at 07:30', next: '2026-11-02T07:30:00+01:00', slot: '2026-10-30T07:30:00+01:00' });
  });

  it('skips _templates and dot folders', async () => {
    const repo = await harness('site');
    await routine(repo, 'brief', 'schedule: "@daily"');
    await routine(repo, '_templates', 'schedule: "@daily"');
    await routine(repo, '.hidden', 'schedule: "@daily"');
    expect(readRoutines(join(repo, '.agents')).map((r) => r.slug)).toEqual(['brief']);
  });
});

describe('harnesses under a folder (#0114)', () => {
  it('finds nested harnesses and skips links, hidden folders, node_modules and packages', async () => {
    const top = await harness('tree');
    await harness('tree/company');
    await harness('tree/company/legacy', 'ai');
    await harness('tree/.hidden');
    await harness('tree/node_modules/pkg');
    await harness('tree/Photos.photoslibrary');
    const outside = await harness('outside');
    await symlink(outside, join(top, 'linked'));
    expect(harnessesUnder(top).map((h) => h.path.slice(tmp.length))).toEqual(['/tree', '/tree/company', '/tree/company/legacy']);
  });

  it('names a harness by its identity file, else by its folder', async () => {
    const repo = await harness('Steuern 2026');
    await writeFile(join(repo, '.agents', 'harness.md'), '---\nschema: 1\nid: steuern\nname: Steuern\nkind: harness\n---\n');
    const plain = await harness('Shop');
    expect(harnessesUnder(tmp).map(({ id, name }) => ({ id, name }))).toEqual([
      { id: 'shop', name: 'Shop' },
      { id: 'steuern', name: 'Steuern' },
    ]);
    expect(plain).toBeTruthy();
  });
});

describe('loopboard routines list (#0114)', () => {
  it('lists each routine with its schedule in words, its next slot and its last run', async () => {
    const repo = await harness('shop');
    await routine(repo, 'weekly', 'schedule: "30 7 * * 1"\ntimezone: Pacific/Auckland', 'x\n', RUNS);
    await routine(repo, 'paused', 'schedule: "@daily"\nenabled: false');
    await routine(repo, 'broken', 'schedule: "61 * * * *"');
    const r = await run('routines', repo);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/ROUTINE\s+SCHEDULE\s+NEXT\s+LAST RUN/);
    // Times read in the routine's zone: 07:30 in Berlin is 19:30 in Auckland.
    expect(r.out).toMatch(/weekly\s+Mondays at 07:30 · Pacific\/Auckland\s+.+07:30\s+ok · .+19:30/);
    expect(r.out).toMatch(/paused\s+Every day at 00:00\s+paused/);
    expect(r.out).toMatch(/broken\s+—\s+invalid/);
    expect(r.out).toContain('✗ routine.md: schedule "61 * * * *": minute "61" is out of range (0–59)');
    expect(r.out).toMatch(/This machine: \S+/);
    expect((await run('routines', 'list', repo)).out).toBe(r.out);
  });

  it('prints the documented JSON shape', async () => {
    const repo = await harness('shop');
    await routine(repo, 'weekly', 'schedule: "30 7 * * 1"\ntimezone: UTC', 'Steps.\n', RUNS);
    const r = await run('routines', repo, '--json');
    const json = JSON.parse(r.out);
    expect(Object.keys(json)).toEqual(['version', 'host', 'now', 'harnesses']);
    expect(json.version).toBe(1);
    expect(Object.keys(json.harnesses[0])).toEqual(['id', 'name', 'path', 'root', 'routines']);
    expect(json.harnesses[0].routines[0]).toMatchObject({ slug: 'weekly', kind: 'agent', state: 'idle', words: 'Mondays at 07:30', body: 'Steps.' });
    expect(json.harnesses[0].routines[0].lastRun).toMatchObject({ status: 'ok', note: expect.stringContaining('Wrote the report.') });
  });

  it('groups by harness with --under and refuses a path next to it', async () => {
    const top = await harness('tree');
    const sub = await harness('tree/company');
    await routine(sub, 'books', 'schedule: "@monthly"');
    const r = await run('routines', '--under', top);
    expect(r.out).toContain(`tree · ${top}`);
    expect(r.out).toContain('No routines in .agents/scheduled/.');
    expect(r.out).toContain(`company · ${sub}`);
    expect(r.out).toMatch(/books\s+On the 1st of every month at 00:00/);
    const both = await run('routines', top, '--under', top);
    expect(both.code).toBe(1);
    expect(both.err).toBe('Name either a harness or --under <dir>, not both.');
  });

  it('refuses a flag the subcommand does not take', async () => {
    const repo = await harness('shop');
    const r = await run('routines', 'list', repo, '--under');
    expect(r.code).toBe(1);
    expect(r.err).toBe('Flag --under needs a value.');
  });
});

describe('loopboard check (#0115)', () => {
  it('fails on a broken routine and names the file and the reason', async () => {
    const repo = await harness('shop');
    await mkdir(join(repo, '.agents', 'scheduled', 'empty'), { recursive: true });
    const dir = join(repo, '.agents', 'scheduled', 'plain');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'routine.md'), 'No frontmatter here.\n');
    await routine(repo, 'neither', 'title: Nothing');
    await routine(repo, 'both', 'schedule: "@daily"\nat: 2026-11-03 09:00');
    await routine(repo, 'cron', 'schedule: "0 25 * * *"');
    await routine(repo, 'never', 'schedule: "0 0 31 4 *"');
    await routine(repo, 'at', 'at: 3 Nov 2026');
    await routine(repo, 'zone', 'schedule: "@daily"\ntimezone: Mars/Olympus');
    await routine(repo, 'durations', 'schedule: "@daily"\nexpires-after: soon\ntimeout: 0m');
    await routine(repo, 'enabled', 'schedule: "@daily"\nenabled: yes');
    await routine(repo, 'creates', 'schedule: "@daily"\ncreates: report');
    await routine(repo, 'period', 'schedule: "@monthly"\ncreates: issue');
    await routine(repo, 'fields', 'schedule: "@monthly"\ncreates: issue\nperiod: fortnight\nissue-category: chore\nissue-status: open\nissue-assignee: bot\nissue-due-after: 36h');
    await routine(repo, 'ids', 'schedule: "@daily"\nwrites-to: [Leben, 2026-taxes]');
    const r = await run('check', repo);
    expect(r.code).toBe(1);
    for (const line of [
      "✗ scheduled/empty/routine.md: doesn't exist — every routine folder needs one",
      '✗ scheduled/plain/routine.md: has no frontmatter',
      '✗ scheduled/neither/routine.md: has neither `schedule` nor `at`',
      '✗ scheduled/both/routine.md: has both `schedule` and `at` — keep one',
      '✗ scheduled/cron/routine.md: schedule "0 25 * * *": hour "25" is out of range (0–23)',
      '✗ scheduled/never/routine.md: schedule "0 0 31 4 *" never occurs',
      '✗ scheduled/at/routine.md: at: "3 Nov 2026" is no time — write YYYY-MM-DD HH:MM',
      '✗ scheduled/zone/routine.md: timezone "Mars/Olympus" is no IANA time zone, such as Europe/Berlin',
      '✗ scheduled/durations/routine.md: expires-after "soon" is no duration — write 30m, 6h, 2d or 1h30m',
      '✗ scheduled/durations/routine.md: timeout "0m" is no duration — write 30m, 6h, 2d or 1h30m',
      '✗ scheduled/enabled/routine.md: enabled is true or false, not "yes"',
      '✗ scheduled/creates/routine.md: creates is "issue" or left out, not "report"',
      '✗ scheduled/period/routine.md: creates: issue needs `period:` — day, week, month, quarter or year',
      '✗ scheduled/fields/routine.md: period is day, week, month, quarter or year, not "fortnight"',
      '✗ scheduled/fields/routine.md: issue-category is task, user-story, bug, not "chore"',
      '✗ scheduled/fields/routine.md: issue-status is backlog, todo, in-progress, in-review, done, blocked, wontfix, not "open"',
      '✗ scheduled/fields/routine.md: issue-assignee is agent, human, not "bot"',
      '✗ scheduled/fields/routine.md: issue-due-after "36h" is whole days, like 10d',
      '✗ scheduled/ids/routine.md: writes-to "Leben" doesn\'t fit the pattern — it names a harness by its id',
      '✗ scheduled/ids/routine.md: writes-to "2026-taxes" starts with a digit — it names a harness by its id',
    ]) {
      expect(r.out).toContain(line);
    }
    expect(r.out).not.toContain('✓');
    const list = await run('routines', repo);
    expect(list.out).toMatch(/cron\s+—\s+invalid/);
  });

  it('warns about unknown fields, harnesses and projects, and unreadable runs; --strict fails on them', async () => {
    const repo = await harness('shop');
    await mkdir(join(tmp, 'config'), { recursive: true });
    const leben = await harness('leben');
    await writeFile(join(leben, '.agents', 'harness.md'), '---\nschema: 1\nid: leben\nname: Leben\naliases: [life]\n---\n');
    await writeFile(join(tmp, 'config', 'workspaces.json'), JSON.stringify({ workspaces: [{ id: 'my-life', name: 'leben', repoPath: leben, root: join(leben, '.agents') }] }));
    await routine(repo, 'weekly', 'schedule: "@weekly"\nexpire-after: 6h\nwrites-to: [leben, life, my-life, steuern]', 'x\n', RUNS);
    await routine(repo, 'books', 'schedule: "@monthly"\ncreates: issue\nperiod: month\nissue-project: 09-nothing');
    await routine(repo, 'stray', 'schedule: "@daily"\nissue-title: Report');
    const r = await run('check', repo);
    expect(r.code).toBe(0);
    for (const line of [
      '! scheduled/weekly/routine.md: unknown field "expire-after"',
      '! scheduled/weekly/routine.md: writes-to "steuern" is no registered harness here',
      '! scheduled/weekly/runs.md: line 26: unknown status "nonsense"',
      '! scheduled/books/routine.md: issue-project "09-nothing" is no project in this harness',
      '! scheduled/stray/routine.md: issue-title only counts with creates: issue',
    ]) {
      expect(r.out).toContain(line);
    }
    expect(r.out).not.toContain('"leben" is no registered');
    expect(r.out).not.toContain('"life" is no registered');
    expect(r.out).toContain('✓ no duplicate numbers, 3 routines valid (5 routine warnings)');
    const strict = await run('check', repo, '--strict');
    expect(strict.code).toBe(1);
    expect(strict.out).toContain('✗ scheduled/weekly/routine.md: unknown field "expire-after"');
  });

  it('says nothing about routines in a harness without them', async () => {
    const repo = await harness('shop');
    expect((await run('check', repo)).out).toBe('✓ no duplicate numbers');
  });
});
