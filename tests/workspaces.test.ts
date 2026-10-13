import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, main } from '../server/cli';
import { configDir } from '../server/paths';
import { loadViews, saveViews, viewsFile } from '../server/views';
import {
  detectRoot,
  loadRegistry,
  registerWorkspace,
  removeWorkspace,
  removeWorkspaces,
  renameWorkspace,
  setLastUsed,
  summarize,
} from '../server/workspaces';

let tmp: string;
let config: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'loopboard-ws-'));
  config = join(tmp, 'config');
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

async function repo(name: string, root: '.agents' | 'ai'): Promise<string> {
  const path = join(tmp, name);
  await mkdir(join(path, root, 'issues'), { recursive: true });
  return path;
}

describe('detectRoot', () => {
  it('prefers .agents over a legacy ai root', async () => {
    const path = await repo('both', 'ai');
    await mkdir(join(path, '.agents', 'issues'), { recursive: true });
    expect(detectRoot(path)).toEqual({ repoPath: path, root: join(path, '.agents') });
  });

  it('finds a legacy ai root', async () => {
    const path = await repo('legacy', 'ai');
    expect(detectRoot(path)?.root).toBe(join(path, 'ai'));
  });

  it('accepts a path that is itself a root', async () => {
    const path = await repo('direct', '.agents');
    expect(detectRoot(join(path, '.agents'))).toEqual({ repoPath: path, root: join(path, '.agents') });
  });

  it('returns null without an issues folder', async () => {
    await mkdir(join(tmp, 'empty'));
    expect(detectRoot(join(tmp, 'empty'))).toBeNull();
  });
});

describe('workspace registry', () => {
  it('registers a repo once and remembers it as last used', async () => {
    const path = await repo('my-app', '.agents');
    const first = await registerWorkspace(config, path);
    const again = await registerWorkspace(config, join(path, '.agents'));

    expect(first).toMatchObject({ id: 'my-app', name: 'my-app', repoPath: path });
    expect(again.id).toBe('my-app');
    const registry = await loadRegistry(config);
    expect(registry.workspaces).toHaveLength(1);
    expect(registry.lastUsed).toBe('my-app');
  });

  it('keeps every update when requests arrive at once', async () => {
    const paths = await Promise.all(['one', 'two', 'three', 'four'].map((n) => repo(n, '.agents')));
    await Promise.all([...paths.map((p) => registerWorkspace(config, p)), setLastUsed(config, 'one')]);
    const registry = await loadRegistry(config);
    expect(registry.workspaces.map((w) => w.id).sort()).toEqual(['four', 'one', 'three', 'two']);
  });

  it('gives repos with the same folder name distinct ids', async () => {
    const a = await repo('a/app', '.agents');
    const b = await repo('b/app', 'ai');
    expect((await registerWorkspace(config, a)).id).toBe('app');
    expect((await registerWorkspace(config, b)).id).toBe('app-2');
  });

  it('renames and removes without touching files', async () => {
    const path = await repo('site', '.agents');
    await writeFile(join(path, '.agents', 'issues', '0001-a.md'), '---\nid: 0001\n---\n');
    await registerWorkspace(config, path);

    expect((await renameWorkspace(config, 'site', 'Marketing site'))?.name).toBe('Marketing site');
    expect(await removeWorkspace(config, 'site')).toBe(true);
    expect((await loadRegistry(config)).workspaces).toHaveLength(0);
    expect(await readFile(join(path, '.agents', 'issues', '0001-a.md'), 'utf8')).toContain('0001');
  });

  it('forgets several at once, or none when one id is unknown (#0099)', async () => {
    for (const name of ['one', 'two', 'three']) await registerWorkspace(config, await repo(name, '.agents'));
    const before = await readFile(join(config, 'workspaces.json'), 'utf8');

    expect(await removeWorkspaces(config, ['one', 'nope'])).toEqual({ removed: [], unknown: ['nope'] });
    expect(await readFile(join(config, 'workspaces.json'), 'utf8')).toBe(before);

    const { removed } = await removeWorkspaces(config, ['three', 'one']);
    expect(removed.map((w) => w.id)).toEqual(['one', 'three']);
    expect(await loadRegistry(config)).toMatchObject({ workspaces: [{ id: 'two' }], lastUsed: 'two' });
  });

  it('reports a workspace whose folder disappeared as unavailable', async () => {
    const path = await repo('gone', '.agents');
    const workspace = await registerWorkspace(config, path);
    await rm(path, { recursive: true });
    expect(summarize(workspace)).toMatchObject({ available: false, issueCount: 0 });
  });

  it('throws a setup hint for a folder without a root', async () => {
    await mkdir(join(tmp, 'plain'));
    await expect(registerWorkspace(config, join(tmp, 'plain'))).rejects.toThrow(/loopboard init/);
  });
});

describe('loopboard workspaces (#0099)', () => {
  const cwd = process.cwd();
  let out: string[];
  let err: string[];

  beforeEach(async () => {
    vi.stubEnv('LOOPBOARD_CONFIG_DIR', config);
    out = [];
    err = [];
    vi.spyOn(console, 'log').mockImplementation((line) => void out.push(String(line)));
    vi.spyOn(console, 'error').mockImplementation((line) => void err.push(String(line)));
    // Any folder will do: no root, no git, no running board.
    await mkdir(join(tmp, 'elsewhere'));
    process.chdir(join(tmp, 'elsewhere'));
  });

  afterEach(() => {
    process.chdir(cwd);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const registryFile = () => readFile(join(config, 'workspaces.json'), 'utf8');

  it('lists id, name, path and whether the folder exists; --json prints the same as data', async () => {
    const here = await repo('here', '.agents');
    const gone = await repo('gone', 'ai');
    await registerWorkspace(config, here);
    await registerWorkspace(config, gone);
    await renameWorkspace(config, 'gone', 'Old app');
    await rm(gone, { recursive: true });

    expect(await main(['workspaces'])).toBe(0);
    expect(out.map((line) => line.split(/\s{2,}/))).toEqual([
      ['ID', 'NAME', 'FOLDER', 'PATH'],
      ['here', 'here', 'exists', join(here, '.agents')],
      ['gone', 'Old app', 'missing', join(gone, 'ai')],
    ]);

    out.length = 0;
    expect(await main(['workspaces', '--json'])).toBe(0);
    expect(JSON.parse(out.join('\n'))).toEqual([
      { id: 'here', name: 'here', path: join(here, '.agents'), exists: true },
      { id: 'gone', name: 'Old app', path: join(gone, 'ai'), exists: false },
    ]);
  });

  it('says so when nothing is registered', async () => {
    expect(await main(['workspaces'])).toBe(0);
    expect(out.join('\n')).toMatch(/^No workspaces registered/);

    out.length = 0;
    expect(await main(['workspaces', '--json'])).toBe(0);
    expect(JSON.parse(out.join('\n'))).toEqual([]);
  });

  it('forgets entries, prints what it removed and leaves files and saved views alone', async () => {
    const drop = await repo('drop', '.agents');
    const legacy = await repo('legacy', 'ai');
    await writeFile(join(drop, '.agents', 'issues', '0001-a.md'), '---\nid: 0001\n---\n');
    for (const path of [await repo('keep', '.agents'), drop, legacy]) await registerWorkspace(config, path);
    await saveViews(config, 'drop', [{ id: 'v1', name: 'Mine', query: { assignee: 'human' } }]);

    expect(await main(['workspaces', 'forget', 'legacy', 'drop'])).toBe(0);
    expect(out).toEqual([
      `forgot drop  (${join(drop, '.agents')})`,
      `  its saved views stay in ${viewsFile(config, 'drop')}`,
      `forgot legacy  (${join(legacy, 'ai')})`,
      'Only the registry changed — no file in a harness was touched.',
    ]);
    expect((await loadRegistry(config)).workspaces.map((w) => w.id)).toEqual(['keep']);
    expect(await readFile(join(drop, '.agents', 'issues', '0001-a.md'), 'utf8')).toBe('---\nid: 0001\n---\n');
    expect(await loadViews(config, 'drop')).toHaveLength(1);
  });

  it('exits 1 and changes nothing for an unknown id, a missing id or an unknown subcommand', async () => {
    await registerWorkspace(config, await repo('one', '.agents'));
    await registerWorkspace(config, await repo('two', '.agents'));
    const before = await registryFile();

    expect(await main(['workspaces', 'forget', 'one', 'nope'])).toBe(1);
    expect(err.join('\n')).toMatch(/^unknown workspace: nope — nothing was forgotten/);
    expect(await main(['workspaces', 'forget'])).toBe(1);
    expect(await main(['workspaces', 'remove', 'one'])).toBe(1);
    expect(err.at(-1)).toMatch(/^Usage: loopboard workspaces/);
    expect(out).toEqual([]);
    expect(await registryFile()).toBe(before);
  });

  it('a running board shows the change on its next load', async () => {
    const client = join(tmp, 'client');
    await mkdir(client);
    await writeFile(join(client, 'index.html'), '<!doctype html>');
    const board = await launch({ target: await repo('alpha', '.agents'), port: 0, configDir: config, clientDir: client });
    if (board.kind !== 'started') throw new Error('the board did not start');
    try {
      await registerWorkspace(config, await repo('beta', '.agents'));
      const listed = async () => {
        const res = await fetch(new URL('/api/workspaces', board.url));
        return ((await res.json()) as { workspaces: { id: string }[] }).workspaces.map((w) => w.id);
      };
      expect(await listed()).toEqual(['alpha', 'beta']);

      expect(await main(['workspaces', 'forget', 'beta'])).toBe(0);
      expect(await listed()).toEqual(['alpha']);
    } finally {
      await board.close();
    }
  });

  it('is described in --help', async () => {
    expect(await main(['--help'])).toBe(0);
    expect(out.join('\n')).toMatch(/loopboard workspaces\s+List registered workspaces \(--json\); `workspaces forget <id>…`/);
  });
});

describe('configDir', () => {
  it('honors LOOPBOARD_CONFIG_DIR, APPDATA on Windows, then XDG', () => {
    expect(configDir({ LOOPBOARD_CONFIG_DIR: '/x/cfg' }, 'darwin')).toBe('/x/cfg');
    expect(configDir({ APPDATA: 'C:\\Users\\me\\AppData' }, 'win32')).toContain('loopboard');
    expect(configDir({ XDG_CONFIG_HOME: '/home/me/.cfg' }, 'linux')).toBe('/home/me/.cfg/loopboard');
  });
});
