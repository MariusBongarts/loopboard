import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkRoot, nextId } from '../server/ids';
import { applyRenumber, planRenumber } from '../server/renumber';

let repo: string;
let root: string;

function git(cwd: string, ...args: string[]) {
  return execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function issue(dir: string, id: string, slug: string, extra = '', body = 'Body.') {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${id}-${slug}.md`), `---\nid: ${id}\ntitle: ${slug}\nstatus: todo\n${extra}---\n\n${body}\n`);
}

beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), 'loopboard-ids-'));
  root = join(repo, '.agents');
  await issue(join(root, 'issues'), '0001', 'first');
  await issue(join(root, 'issues', '_archive'), '0003', 'archived');
  await mkdir(join(root, 'projects', '01-launch'), { recursive: true });
});

afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
  await rm(`${repo}-wt`, { recursive: true, force: true });
});

describe('next-id', () => {
  it('counts the archive and works without git', () => {
    expect(nextId(root, 'issue')).toBe('0004');
    expect(nextId(root, 'project')).toBe('02');
  });

  it('sees unmerged branches, other worktrees and remote-tracking refs', async () => {
    git(repo, 'init', '-q', '-b', 'main');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'base');

    git(repo, 'checkout', '-qb', 'feat');
    await issue(join(root, 'issues'), '0007', 'on-a-branch');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'feat');
    git(repo, 'checkout', '-q', 'main');
    expect(existsSync(join(root, 'issues', '0007-on-a-branch.md'))).toBe(false);
    expect(nextId(root, 'issue')).toBe('0008');

    git(repo, 'worktree', 'add', '-q', `${repo}-wt`, '-b', 'wt');
    await issue(join(`${repo}-wt`, '.agents', 'issues'), '0011', 'uncommitted-in-worktree');
    expect(nextId(root, 'issue')).toBe('0012');

    git(repo, 'checkout', '-qb', 'remote-only');
    await issue(join(root, 'issues'), '0020', 'pushed-by-someone');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'remote');
    const sha = git(repo, 'rev-parse', 'HEAD').trim();
    git(repo, 'checkout', '-q', 'main');
    git(repo, 'branch', '-qD', 'remote-only');
    git(repo, 'update-ref', 'refs/remotes/origin/remote-only', sha);
    expect(nextId(root, 'issue')).toBe('0021');
  });
});

// The board reports a mis-named file as skipped; its number stays taken (#0071).
describe('near-miss names', () => {
  it('count for the next number', async () => {
    await writeFile(join(root, 'issues', '0009-Tax-Return.md'), '---\nid: 0009\ntitle: Tax return\n---\n');
    await mkdir(join(root, 'projects', '05-Offline-Mode'));
    expect(nextId(root, 'issue')).toBe('0010');
    expect(nextId(root, 'project')).toBe('06');
  });

  it('collide with a well-named file that has the same number', async () => {
    await writeFile(join(root, 'issues', '0001_first.md'), '---\nid: 0001\ntitle: First\n---\n');
    expect(checkRoot(root, false).duplicates.map((d) => d.id)).toEqual(['0001']);
  });

  it('count for a dotted project folder, never for a stray file in projects/', async () => {
    await mkdir(join(root, 'projects', '03-offline-v1.2'));
    await writeFile(join(root, 'projects', '07-notes.txt'), 'notes');
    expect(nextId(root, 'project')).toBe('04');

    // The same on a branch, where only the tree says what is a folder.
    await writeFile(join(root, 'projects', '03-offline-v1.2', 'wip.md'), '# Offline — WIP\n');
    await writeFile(join(root, 'projects', '01-launch', 'wip.md'), '# Launch — WIP\n');
    git(repo, 'init', '-q', '-b', 'main');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'base');
    git(repo, 'checkout', '-qb', 'feat');
    await mkdir(join(root, 'projects', '05-on a branch'));
    await writeFile(join(root, 'projects', '05-on a branch', 'wip.md'), '# Branch — WIP\n');
    await writeFile(join(root, 'projects', '09-notes.txt'), 'notes');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'feat');
    git(repo, 'checkout', '-q', 'main');
    expect(nextId(root, 'project')).toBe('06');
  });
});

describe('check', () => {
  it('flags two different files with one number in the working tree', async () => {
    await issue(join(root, 'issues'), '0001', 'twin');
    const report = checkRoot(root, false);
    expect(report.duplicates).toEqual([
      {
        kind: 'issue',
        id: '0001',
        names: [
          { name: '0001-first.md', where: 'working tree' },
          { name: '0001-twin.md', where: 'working tree' },
        ],
      },
    ]);
  });

  it('flags a collision with another branch only with --branches, and ignores the same issue on two branches', async () => {
    git(repo, 'init', '-q', '-b', 'main');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'base');
    git(repo, 'checkout', '-qb', 'feat');
    await issue(join(root, 'issues'), '0004', 'feature-version');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'feat');
    git(repo, 'checkout', '-q', 'main');
    await issue(join(root, 'issues'), '0004', 'main-version');

    expect(checkRoot(root, false).duplicates).toEqual([]);
    const dupes = checkRoot(root, true).duplicates;
    expect(dupes.map((d) => d.id)).toEqual(['0004']);
    expect(dupes[0].names.map((n) => n.name).sort()).toEqual(['0004-feature-version.md', '0004-main-version.md']);
  });

  it('reports dangling parent: and #NNNN references', async () => {
    await issue(join(root, 'issues'), '0002', 'child', 'parent: 0042\n', 'Follows #0001 and #0099.');
    expect(checkRoot(root, false).dangling).toEqual([
      { file: 'issues/0002-child.md', ref: 'parent: 0042' },
      { file: 'issues/0002-child.md', ref: '#0099' },
    ]);
  });

  it('ignores #NNNN inside code, which is an example', async () => {
    await issue(join(root, 'issues'), '0002', 'child', '', 'Run `check` on `#0098`.\n\n```\nsee #0099\n```\n\nBut #0097.');
    expect(checkRoot(root, false).dangling).toEqual([{ file: 'issues/0002-child.md', ref: '#0097' }]);
  });

  it("ignores another harness's shop#NNNN, URL fragments and entities (#0100)", async () => {
    await issue(join(root, 'issues'), '0002', 'child', '', 'After shop#0099, https://example.com/#0098 &#8212; and #0097.');
    expect(checkRoot(root, false).dangling).toEqual([{ file: 'issues/0002-child.md', ref: '#0097' }]);
  });
});

describe('renumber', () => {
  it('moves an issue and rewrites #refs, parent: and links', async () => {
    await issue(join(root, 'issues'), '0002', 'child', 'parent: 0001\n', 'Needs #0001 first.');
    await writeFile(join(root, 'projects', '01-launch', 'wip.md'), '- [ ] [#0001 First](../../issues/0001-first.md) — todo\n');

    const plan = planRenumber({ root, oldId: '0001', newId: '0005' });
    expect(plan.to).toBe('issues/0005-first.md');
    applyRenumber(root, plan);

    expect(await readFile(join(root, 'issues', '0005-first.md'), 'utf8')).toContain('id: 0005');
    const child = await readFile(join(root, 'issues', '0002-child.md'), 'utf8');
    expect(child).toContain('parent: 0005');
    expect(child).toContain('Needs #0005 first.');
    expect(await readFile(join(root, 'projects', '01-launch', 'wip.md'), 'utf8')).toBe(
      '- [ ] [#0005 First](../../issues/0005-first.md) — todo\n',
    );
    expect(existsSync(join(root, 'issues', '0001-first.md'))).toBe(false);
  });

  it("leaves another harness's shop#NNNN alone (#0100)", async () => {
    await issue(join(root, 'issues'), '0002', 'child', '', '#0001, (#0001) and shop#0001.');
    applyRenumber(root, planRenumber({ root, oldId: '0001', newId: '0005' }));
    expect(await readFile(join(root, 'issues', '0002-child.md'), 'utf8')).toContain('#0005, (#0005) and shop#0001.');
  });

  it('needs --file for twins and leaves their ambiguous #refs alone', async () => {
    await issue(join(root, 'issues'), '0001', 'twin');
    await issue(join(root, 'issues'), '0002', 'mentions', '', 'See #0001.');
    expect(() => planRenumber({ root, oldId: '0001' })).toThrow(/Pick one with --file/);

    const plan = planRenumber({ root, oldId: '0001', file: '0001-twin.md' });
    expect(plan.to).toBe('issues/0004-twin.md');
    expect(plan.ambiguous).toEqual(['issues/0002-mentions.md']);
    applyRenumber(root, plan);
    expect(await readFile(join(root, 'issues', '0002-mentions.md'), 'utf8')).toContain('See #0001.');
  });

  // `check` counts a near miss as holding its number, so `renumber` has to
  // find it too, and may never move another file instead (#0071).
  it('moves the file --file names, also a near miss, and refuses a name that has not the number', async () => {
    await writeFile(join(root, 'issues', '0001_First copy.md'), '---\nid: 0001\ntitle: Copy\n---\n');
    await issue(join(root, 'issues'), '0002', 'mentions', 'parent: 0001\n', 'See #0001.');

    expect(() => planRenumber({ root, oldId: '0001', file: '0002-mentions.md' })).toThrow(/--file 0002-mentions\.md names no issue numbered 0001/);
    expect(() => planRenumber({ root, oldId: '0001', file: 'first.md' })).toThrow(/names no issue numbered 0001/);
    expect(() => planRenumber({ root, oldId: '0003', file: '0001-first.md' })).toThrow(/names no issue numbered 0003/);

    const plan = planRenumber({ root, oldId: '0001', file: '0001_First copy.md' });
    expect(plan).toMatchObject({ from: 'issues/0001_First copy.md', to: 'issues/0004_First copy.md', ambiguous: ['issues/0002-mentions.md'] });
    applyRenumber(root, plan);

    expect(existsSync(join(root, 'issues', '0001-first.md'))).toBe(true);
    expect(await readFile(join(root, 'issues', '0004_First copy.md'), 'utf8')).toContain('id: 0004');
    const child = await readFile(join(root, 'issues', '0002-mentions.md'), 'utf8');
    expect(child).toContain('parent: 0001');
    expect(child).toContain('See #0001.');
  });

  it('moves a near-miss project folder and keeps the rest of its name', async () => {
    await mkdir(join(root, 'projects', '01_Beta (old)'));
    await issue(join(root, 'issues'), '0002', 'in-beta', 'project: 01_Beta (old)\n', 'See ../projects/01_Beta (old)/prd.md');

    const plan = planRenumber({ root, oldId: '01', file: '01_Beta (old)' });
    expect(plan).toMatchObject({ from: 'projects/01_Beta (old)', to: 'projects/02_Beta (old)' });
    applyRenumber(root, plan);

    expect(existsSync(join(root, 'projects', '01-launch'))).toBe(true);
    const text = await readFile(join(root, 'issues', '0002-in-beta.md'), 'utf8');
    expect(text).toContain('project: 02_Beta (old)');
    expect(text).toContain('projects/02_Beta (old)/prd.md');
  });

  it('moves a project and rewrites project: fields and links', async () => {
    await issue(join(root, 'issues'), '0002', 'in-project', 'project: 01-launch\n', 'See ../projects/01-launch/prd.md');
    await writeFile(join(root, 'projects', '01-launch', 'prd.md'), '# Launch\n');

    applyRenumber(root, planRenumber({ root, oldId: '01', newId: '04' }));

    expect(existsSync(join(root, 'projects', '04-launch', 'prd.md'))).toBe(true);
    const text = await readFile(join(root, 'issues', '0002-in-project.md'), 'utf8');
    expect(text).toContain('project: 04-launch');
    expect(text).toContain('projects/04-launch/prd.md');
  });
});

describe('this repo', () => {
  it('has no duplicate issue or project numbers', () => {
    expect(checkRoot(join(__dirname, '..', '.agents'), false).duplicates).toEqual([]);
  });
});
