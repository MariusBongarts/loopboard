import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configDir } from '../server/paths';
import {
  detectRoot,
  loadRegistry,
  registerWorkspace,
  removeWorkspace,
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

describe('configDir', () => {
  it('honors LOOPBOARD_CONFIG_DIR, APPDATA on Windows, then XDG', () => {
    expect(configDir({ LOOPBOARD_CONFIG_DIR: '/x/cfg' }, 'darwin')).toBe('/x/cfg');
    expect(configDir({ APPDATA: 'C:\\Users\\me\\AppData' }, 'win32')).toContain('loopboard');
    expect(configDir({ XDG_CONFIG_HOME: '/home/me/.cfg' }, 'linux')).toBe('/home/me/.cfg/loopboard');
  });
});
