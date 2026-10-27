import { expect, test } from '@playwright/test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
});
