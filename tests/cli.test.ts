import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { launch, launchOptions, main, type LaunchResult } from '../server/cli';
import { loadRegistry } from '../server/workspaces';

const CWD = process.cwd();
let tmp: string;
let client: string;
let config: string;
const started: LaunchResult[] = [];

async function repo(name: string): Promise<string> {
  const path = join(tmp, name);
  await mkdir(join(path, '.agents', 'issues'), { recursive: true });
  return path;
}

async function issue(repoPath: string, id: string): Promise<void> {
  await writeFile(join(repoPath, '.agents', 'issues', `${id}-first.md`), `---\nid: ${id}\ntitle: First\nstatus: todo\n---\n`);
}

// Runs the CLI in-process and collects what it printed.
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
  // The real path: tests compare against the working directory (macOS /var → /private/var).
  tmp = await realpath(await mkdtemp(join(tmpdir(), 'loopboard-cli-')));
  client = join(tmp, 'client');
  await mkdir(client);
  await writeFile(join(client, 'index.html'), '<!doctype html>');
  // Its own config directory, never the user's registry (#0076).
  config = join(tmp, 'config');
  vi.stubEnv('LOOPBOARD_CONFIG_DIR', config);
});

afterEach(async () => {
  for (const r of started.splice(0)) if (r.kind === 'started') await r.close();
  process.chdir(CWD);
  vi.unstubAllEnvs();
  await rm(tmp, { recursive: true, force: true });
});

describe('loopboard [path]', () => {
  it('starts a server for the repo and registers it', async () => {
    const result = await launch({ target: await repo('alpha'), port: 0, configDir: config, clientDir: client });
    started.push(result);

    expect(result.kind).toBe('started');
    if (result.kind !== 'started') return;
    expect(result.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/w\/alpha$/);
    const health = await fetch(result.url.replace('/w/alpha', '/api/health'));
    expect(await health.json()).toMatchObject({ name: 'loopboard' });
  });

  it('hands a second repo to the running server instead of starting another', async () => {
    const first = await launch({ target: await repo('alpha'), port: 0, configDir: config, clientDir: client });
    started.push(first);
    const second = await launch({ target: await repo('beta'), port: 0, configDir: config, clientDir: client });

    expect(second.kind).toBe('handed-off');
    if (second.kind !== 'handed-off') return;
    expect(second.url).toMatch(/\/w\/beta$/);
    expect((await loadRegistry(config)).workspaces.map((w) => w.id)).toEqual(['alpha', 'beta']);
  });

  it('explains how to set up a folder without a root', async () => {
    await mkdir(join(tmp, 'plain'));
    const result = await launch({ target: join(tmp, 'plain'), port: 0, configDir: join(tmp, 'c'), clientDir: client });
    expect(result).toMatchObject({ kind: 'error' });
    if (result.kind === 'error') expect(result.message).toMatch(/npx loopboard init/);
  });
});

describe('flags (#0076)', () => {
  // #0078 makes --kind valid and takes this test over.
  it('init --kind docs creates nothing', async () => {
    const plain = join(tmp, 'plain');
    await mkdir(plain);
    process.chdir(plain);

    expect(await run('init', '--kind', 'docs')).toEqual({
      code: 1,
      out: '',
      err: 'Unknown flag --kind: `loopboard init` takes --with-extras, --upgrade, --force, --dry-run.',
    });
    expect(await readdir(plain)).toEqual([]);
  });

  it('renumber <old> --path <repo> works without a new number', async () => {
    const app = await repo('alpha');
    await issue(app, '0042');

    const r = await run('renumber', '0042', '--path', app);

    expect(r).toMatchObject({ code: 0, err: '' });
    expect(r.out).toContain('moved issues/0042-first.md → issues/0043-first.md');
    expect(await readdir(join(app, '.agents', 'issues'))).toEqual(['0043-first.md']);
  });

  it('an unknown flag stops every command, and the board, before it does anything', async () => {
    const app = await repo('alpha');
    await issue(app, '0001');

    for (const argv of [
      [app, '--port', '0', '--no-open', '--strict'],
      ['init', app, '--dry'],
      ['next-id', 'issue', app, '--json'],
      ['check', app, '--branch'],
      ['renumber', '0001', '--path', app, '--force'],
    ]) {
      const r = await run(...argv);
      expect(r, argv.join(' ')).toMatchObject({ code: 1, out: '' });
      expect(r.err).toMatch(/^Unknown flag --\w+: `loopboard [^`]+` takes [^\n]+\.$/);
    }
    expect(await readdir(app)).toEqual(['.agents']);
    expect(await readdir(join(app, '.agents', 'issues'))).toEqual(['0001-first.md']);
    expect(existsSync(config)).toBe(false);
  });

  it('--help covers a linked clone and unknown flags, also after a command', async () => {
    const plain = join(tmp, 'plain');
    await mkdir(plain);
    process.chdir(plain);

    const help = await run('init', '--help');

    expect(help.code).toBe(0);
    expect(help.out).toBe((await run('--help')).out);
    expect(help.out).toContain('loopboard renumber <old> [new]');
    expect(help.out).toContain('`pnpm build && npm link` puts loopboard on the PATH');
    expect(help.out).toContain('`npx loopboard` needs the\npublished package');
    expect(help.out).toContain("A flag a command doesn't know stops it with exit code 1");
    expect(await readdir(plain)).toEqual([]);
  });
});

describe('from another folder (#0076)', () => {
  it('runs every command that takes a target', async () => {
    const elsewhere = join(tmp, 'elsewhere');
    const app = join(tmp, 'app');
    await mkdir(elsewhere);
    process.chdir(elsewhere);

    expect((await run('init', '../app')).code).toBe(0);
    expect(existsSync(join(app, '.agents', 'issues', 'README.md'))).toBe(true);
    await issue(app, '0001');
    expect(await run('next-id', 'issue', '../app')).toEqual({ code: 0, out: '0002', err: '' });
    expect(await run('check', '../app')).toMatchObject({ code: 0, err: '' });
    expect((await run('renumber', '0001', '--path', '../app')).out).toContain('moved issues/0001-first.md → issues/0002-first.md');

    const options = launchOptions(['../app', '--port', '0', '--no-open']);
    expect(options).toMatchObject({ target: app, port: 0, configDir: config, open: false });
    const board = await launch({ ...options, clientDir: client });
    started.push(board);
    expect(board).toMatchObject({ kind: 'started', workspaceRoot: join(app, '.agents') });
    expect((await loadRegistry(config)).workspaces.map((w) => w.repoPath)).toEqual([app]);

    expect(await readdir(elsewhere)).toEqual([]);
  });
});

describe('bin/loopboard.js (#0076)', () => {
  const node = (script: string) => spawnSync(process.execPath, [script, '--version'], { cwd: tmp, encoding: 'utf8' });

  it('names the build command when the clone has no build/, also through a link', async () => {
    const clone = join(tmp, 'clone');
    await mkdir(join(clone, 'bin'), { recursive: true });
    await writeFile(join(clone, 'package.json'), '{ "name": "loopboard", "type": "module" }\n');
    await copyFile(resolve(__dirname, '..', 'bin', 'loopboard.js'), join(clone, 'bin', 'loopboard.js'));

    const direct = node(join(clone, 'bin', 'loopboard.js'));

    expect(direct.status).toBe(1);
    expect(direct.stdout).toBe('');
    expect(direct.stderr).toBe(`loopboard isn't built yet: run \`pnpm build\` in ${clone}, then try again.\n`);

    // `npm link` puts a symlink on the PATH; Windows gets a shim instead.
    if (process.platform === 'win32') return;
    await symlink(join(clone, 'bin', 'loopboard.js'), join(tmp, 'loopboard'));
    expect(node(join(tmp, 'loopboard')).stderr).toBe(direct.stderr);
  });
});
