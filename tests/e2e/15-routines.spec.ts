import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loopboard, repo, sandbox } from './cli';

// Spec § 15 — routines, through the real `loopboard` binary.
let box: { dir: string; config: string };
test.beforeEach(() => {
  box = sandbox();
});
test.afterEach(() => {
  rmSync(box.dir, { recursive: true, force: true });
});

function routine(repoPath: string, slug: string, frontmatter: string, body = 'Do the thing.\n'): string {
  const dir = join(repoPath, '.agents', 'scheduled', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'routine.md'), `---\n${frontmatter.trim()}\n---\n\n${body}`);
  return dir;
}

test.describe('§ 15 routines on the command line', () => {
  test('write a routine and list the routines of a harness', () => {
    const app = repo(box.dir, 'shop');
    const weekly = routine(app, 'weekly-report', 'title: Weekly report\nschedule: "30 7 * * 1"\ntimezone: Pacific/Auckland\nexpires-after: 6h', 'Write the weekly report.\n');
    writeFileSync(
      join(weekly, 'runs.md'),
      '# Runs: Weekly report\n\n## 2026-10-26 07:30 · ok\n- started: 2026-10-26T07:30:04+13:00\n- finished: 2026-10-26T07:41:15+13:00\n- host: studio\n\n> Wrote the report.\n',
    );
    routine(app, 'paused', 'schedule: "@daily"\nenabled: false');
    routine(app, 'broken', 'schedule: "61 * * * *"');

    const text = loopboard(['routines'], app, box.config);
    expect(text.status).toBe(0);
    expect(text.stdout).toMatch(/weekly-report\s+Mondays at 07:30 · Pacific\/Auckland\s+.+07:30\s+ok · .+07:30/);
    expect(text.stdout).toMatch(/paused\s+Every day at 00:00\s+paused/);
    expect(text.stdout).toMatch(/broken\s+—\s+invalid/);
    expect(text.stdout).toContain('✗ routine.md: schedule "61 * * * *": minute "61" is out of range (0–59)');

    const json = JSON.parse(loopboard(['routines', 'list', '--json'], app, box.config).stdout);
    expect(json.version).toBe(1);
    const byslug = Object.fromEntries(json.harnesses[0].routines.map((r: { slug: string }) => [r.slug, r]));
    expect(byslug['weekly-report']).toMatchObject({
      title: 'Weekly report',
      kind: 'agent',
      enabled: true,
      state: 'idle',
      timezone: 'Pacific/Auckland',
      expiresAfter: '6h',
      timeout: '2h',
      body: 'Write the weekly report.',
      lastRun: { status: 'ok', note: 'Wrote the report.' },
    });
    expect(byslug.paused).toMatchObject({ title: 'paused', state: 'paused', next: null });
  });

  test('list the routines under a folder', () => {
    const top = repo(box.dir, 'tree');
    const company = repo(top, 'company');
    routine(company, 'books', 'schedule: "@monthly"');
    const r = loopboard(['routines', '--under', top], box.dir, box.config);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(`tree · ${top}`);
    expect(r.stdout).toContain(`company · ${company}`);
    expect(r.stdout).toMatch(/books\s+On the 1st of every month at 00:00/);
  });

  test('check routines', () => {
    const app = repo(box.dir, 'shop');
    routine(app, 'weekly', 'schedule: "30 7 * * 1"\nexpire-after: 6h');
    const warned = loopboard(['check'], app, box.config);
    expect(warned.status).toBe(0);
    expect(warned.stdout).toContain('! scheduled/weekly/routine.md: unknown field "expire-after"');
    expect(warned.stdout).toContain('✓ no duplicate numbers, 1 routine valid (1 routine warning)');
    routine(app, 'broken', 'schedule: "0 25 * * *"');
    const failed = loopboard(['check'], app, box.config);
    expect(failed.status).toBe(1);
    expect(failed.stdout).toContain('✗ scheduled/broken/routine.md: schedule "0 25 * * *": hour "25" is out of range (0–23)');
  });

  test('record the start of a run and finish it with a note from stdin', () => {
    const app = repo(box.dir, 'shop');
    const dir = routine(app, 'hourly', 'title: Hourly check\nschedule: "@hourly"');
    const started = loopboard(['routines', 'start', 'hourly', '--path', app], box.dir, box.config);
    expect(started.status).toBe(0);
    expect(started.stdout).toMatch(/^started hourly — slot \S+/);
    expect(started.stdout).toContain(`finish: loopboard routines finish ${dir} --status ok --note "…"`);
    const again = loopboard(['routines', 'start', dir], box.dir, box.config);
    expect(again.status).toBe(1);
    expect(again.stderr).toMatch(/hourly is running since today \d\d:\d\d/);

    const bin = join(process.cwd(), 'bin', 'loopboard.js');
    const finished = spawnSync(process.execPath, [bin, 'routines', 'finish', dir, '--status', 'failed', '--note', '-'], {
      input: 'The API was down.\nNext run: try again.\n',
      env: { ...process.env, LOOPBOARD_CONFIG_DIR: box.config },
      encoding: 'utf8',
    });
    expect(finished.stdout.trim()).toBe('finished hourly: failed');
    const runs = readFileSync(join(dir, 'runs.md'), 'utf8');
    expect(runs).toMatch(/^# Runs: Hourly check\n/);
    expect(runs).toMatch(/## \S+ \S+ · running\n- started: \S+\n- slot: \S+\n- host: \S+\n/);
    expect(runs).toMatch(/## \S+ \S+ · failed\n- started: \S+\n- finished: \S+\n- slot: \S+\n- host: \S+\n\n> The API was down\.\n> Next run: try again\.\n$/);
    const json = JSON.parse(loopboard(['routines', '--json'], app, box.config).stdout);
    expect(json.harnesses[0].routines[0].lastRun).toMatchObject({ status: 'failed', note: 'The API was down.\nNext run: try again.' });
  });

  test("file the period's issue, once, and report a duplicate", () => {
    const app = repo(box.dir, 'books');
    const dir = routine(
      app,
      'monthly-books',
      'title: Monthly books\nschedule: "0 6 1 * *"\ncreates: issue\nperiod: month\nissue-title: "Books for {previous}"\nissue-assignee: human\nissue-due-after: 9d',
      'Send the {previous} books to the accountant.\n',
    );
    const filed = loopboard(['routines', 'start', dir], box.dir, box.config);
    expect(filed.status).toBe(0);
    expect(filed.stdout).toMatch(/^filed #0002 Books for \d{4}-\d{2} \(issues\/0002-books-for-\d{4}-\d{2}\.md\) for monthly-books/);
    const issues = join(app, '.agents', 'issues');
    const name = readdirSync(issues).find((f) => f.startsWith('0002-'))!;
    const text = readFileSync(join(issues, name), 'utf8');
    expect(text).toMatch(/^---\nid: 0002\ntitle: Books for \d{4}-\d{2}\ncategory: task\nstatus: todo\nassignee: human\nlabels: \[\]\ndue: \d{4}-\d{2}-10\nrecurrence: monthly-books@\d{4}-\d{2}\ncreated: \S+\n---\n\nSend the \d{4}-\d{2} books to the accountant\.\n$/);
    const again = loopboard(['routines', 'start', dir], box.dir, box.config);
    expect(again.stdout).toContain('is there already');
    expect(readdirSync(issues).filter((f) => f.endsWith('.md')).length).toBe(2);

    writeFileSync(join(issues, '0003-twin.md'), text.replace('id: 0002', 'id: 0003'));
    const check = loopboard(['check'], app, box.config);
    expect(check.status).toBe(1);
    expect(check.stdout).toMatch(/✗ duplicate recurrence monthly-books@\d{4}-\d{2}:\n {4}issues\/0002-books-for-\S+\n {4}issues\/0003-twin\.md/);
  });

  test('ask what is due', () => {
    const app = repo(box.dir, 'shop');
    routine(app, 'hourly', 'schedule: "@hourly"');
    routine(app, 'books', 'schedule: "@monthly"\ncreates: issue\nperiod: month');
    routine(app, 'paused', 'schedule: "@hourly"\nenabled: false');
    routine(app, 'broken', 'schedule: "61 * * * *"');
    const dry = loopboard(['routines', 'due', '--dry-run'], app, box.config);
    expect(dry.status).toBe(0);
    expect(dry.stdout).toContain('Dry run — nothing was written.');
    expect(dry.stdout).toMatch(/run\s+shop\/hourly\s+slot /);
    expect(dry.stdout).toMatch(/filed\s+shop\/books\s+Filed #0002 books \d{4}-\d{2}/);
    expect(dry.stdout).toMatch(/invalid\s+shop\/broken/);
    expect(dry.stdout).not.toContain('paused');
    expect(readdirSync(join(app, '.agents', 'issues'))).toEqual(['0001-first.md']);

    const json = JSON.parse(loopboard(['routines', 'due', '--json'], app, box.config).stdout);
    expect(json).toMatchObject({ version: 1, dryRun: false, run: [{ slug: 'hourly', missed: 0 }], filed: [{ slug: 'books', status: 'ok', issue: { id: '0002' } }], problems: [{ slug: 'broken' }] });
    expect(loopboard(['routines', 'due', '--json'], app, box.config).stdout).toContain('"filed": []');
  });
});
