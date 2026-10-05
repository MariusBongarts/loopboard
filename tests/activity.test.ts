import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { issueActivity } from '../server/activity';

let repo: string;
const git = (...args: string[]) =>
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...args], { cwd: repo, stdio: 'pipe' });
const file = () => join(repo, '.agents', 'issues', '0042-thing.md');
const write = (status: string) => writeFile(file(), `---\nid: 0042\ntitle: Thing\nstatus: ${status}\n---\n\nBody.\n`);

beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), 'loopboard-activity-'));
  await mkdir(join(repo, '.agents', 'issues'), { recursive: true });
});

afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

describe('issueActivity', () => {
  it('lists mentioning commits, matching branches and status changes', async () => {
    git('init', '-q', '-b', 'main');
    await write('todo');
    git('add', '.');
    git('commit', '-qm', 'File #0042');
    await write('in-progress');
    git('commit', '-qam', 'Start work');
    await writeFile(join(repo, 'code.ts'), 'x');
    git('add', '.');
    git('commit', '-qm', 'Implement the thing (#0042)');
    await write('done');
    git('commit', '-qam', 'Close it');
    git('branch', 'feat/0042-thing');
    git('branch', 'feat/10042-other');

    const a = issueActivity(file(), '0042');
    expect(a.git).toBe(true);
    expect(a.commits.map((c) => c.subject)).toEqual(['Implement the thing (#0042)', 'File #0042']);
    expect(a.branches).toEqual(['feat/0042-thing']);
    expect(a.history.map((h) => [h.subject, h.change])).toEqual([
      ['Close it', 'in-progress → done'],
      ['Start work', 'todo → in-progress'],
      ['File #0042', 'created as todo'],
    ]);
  });

  it('reports no git outside a repository', async () => {
    await write('todo');
    expect(issueActivity(file(), '0042')).toEqual({ git: false, commits: [], branches: [], history: [] });
  });
});
