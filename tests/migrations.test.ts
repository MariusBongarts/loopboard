import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { harnessLevel, latestMigration, parseMigrations, readMigrations, workspaceHarness, type Migration } from '../server/migrations';
import { packageRoot } from '../server/paths';

const MIGRATIONS: Migration[] = [
  { id: 'M001', title: 'One', date: '2026-10-01' },
  { id: 'M002', title: 'Two', date: '2026-10-02' },
  { id: 'M003', title: 'Three', date: null },
];

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'loopboard-migrations-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

async function repo(name: string, opts: { root?: '.agents' | 'ai'; agents?: string } = {}) {
  const repoPath = join(tmp, name);
  const root = join(repoPath, opts.root ?? '.agents');
  await mkdir(join(root, 'issues'), { recursive: true });
  if (opts.agents !== undefined) await writeFile(join(repoPath, 'AGENTS.md'), opts.agents);
  return { id: name, name, repoPath, root };
}

describe('migrations (#0062)', () => {
  it('parses ids, titles and dates from MIGRATIONS.md', () => {
    const text = '# Migrations\n\n## M002 — Second thing\n\n*2026-10-04 · #0039*\n\n## M001 — First `thing`\n\n*2026-10-03 · #0002*\n';
    expect(parseMigrations(text)).toEqual([
      { id: 'M001', title: 'First `thing`', date: '2026-10-03' },
      { id: 'M002', title: 'Second thing', date: '2026-10-04' },
    ]);
  });

  it('reads the shipped MIGRATIONS.md, newest last', () => {
    const shipped = readMigrations(packageRoot());
    expect(shipped.length).toBeGreaterThan(0);
    expect(shipped.at(-1)?.id).toBe(latestMigration(packageRoot()));
    expect(shipped.every((m) => m.date)).toBe(true);
  });

  it('treats a harness without a marker as M000', () => {
    expect(harnessLevel('# Agents\n')).toEqual({ level: 'M000', marked: false });
    expect(harnessLevel('<!-- loopboard:migration M002 -->')).toEqual({ level: 'M002', marked: true });
  });

  it('reports up to date, behind, unmarked, no AGENTS.md, missing and legacy roots', async () => {
    const current = await repo('current', { agents: '<!-- loopboard:migration M003 -->\n' });
    const behind = await repo('behind', { agents: '<!-- loopboard:migration M001 -->\n' });
    const unmarked = await repo('unmarked', { agents: '# Agents\n', root: 'ai' });
    const bare = await repo('bare');
    const gone = { id: 'gone', name: 'gone', repoPath: join(tmp, 'gone'), root: join(tmp, 'gone', '.agents') };

    expect(workspaceHarness(current, MIGRATIONS)).toMatchObject({ status: 'current', level: 'M003', behind: 0, legacy: false });
    expect(workspaceHarness(behind, MIGRATIONS)).toMatchObject({ status: 'behind', level: 'M001', behind: 2 });
    expect(workspaceHarness(unmarked, MIGRATIONS)).toMatchObject({ status: 'unmarked', level: 'M000', behind: 3, legacy: true });
    expect(workspaceHarness(bare, MIGRATIONS)).toMatchObject({ status: 'no-agents-md', level: null });
    expect(workspaceHarness(gone, MIGRATIONS)).toMatchObject({ status: 'missing', level: null });
  });
});
