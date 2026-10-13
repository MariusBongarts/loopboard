import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commands, launch, type LaunchResult } from '../server/cli';
import { loadRegistry } from '../server/workspaces';

let tmp: string;
let client: string;
const started: LaunchResult[] = [];

async function repo(name: string): Promise<string> {
  const path = join(tmp, name);
  await mkdir(join(path, '.agents', 'issues'), { recursive: true });
  return path;
}

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'loopboard-cli-'));
  client = join(tmp, 'client');
  await mkdir(client);
  await writeFile(join(client, 'index.html'), '<!doctype html>');
});

afterEach(async () => {
  for (const r of started.splice(0)) if (r.kind === 'started') await r.close();
  await rm(tmp, { recursive: true, force: true });
});

describe('loopboard [path]', () => {
  it('starts a server for the repo and registers it', async () => {
    const config = join(tmp, 'config');
    const result = await launch({ target: await repo('alpha'), port: 0, configDir: config, clientDir: client });
    started.push(result);

    expect(result.kind).toBe('started');
    if (result.kind !== 'started') return;
    expect(result.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/w\/alpha$/);
    const health = await fetch(result.url.replace('/w/alpha', '/api/health'));
    expect(await health.json()).toMatchObject({ name: 'loopboard' });
  });

  it('hands a second repo to the running server instead of starting another', async () => {
    const config = join(tmp, 'config');
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

// `check` prints the board's own list of skipped files (#0071).
describe('loopboard check', () => {
  it('lists the files the board skips and fails on them with --strict', async () => {
    const path = await repo('alpha');
    const issues = join(path, '.agents', 'issues');
    await writeFile(join(issues, '0001-first.md'), '---\nid: 0001\ntitle: First\n---\n');
    await writeFile(join(issues, '0002-Tax-Return.md'), '---\nid: 0002\ntitle: Tax return\n---\n');
    await writeFile(join(issues, '0003-broken.md'), '---\nid: 0003\ntitle: Broken: unquoted colon\n---\n');
    // Nothing can read a folder as a file, on any platform.
    await mkdir(join(issues, '0004-unreadable.md'));
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      expect(await commands.check.run([path])).toBe(0);
      expect(log.mock.calls.map((c) => c.join(' '))).toEqual([
        '! issues/0002-Tax-Return.md: skipped — name must be NNNN-slug.md (lowercase letters, digits and dashes)',
        expect.stringMatching(/^! issues\/0003-broken\.md: skipped — invalid frontmatter: /),
        expect.stringMatching(/^! issues\/0004-unreadable\.md: skipped — can't be read \(E\w+\)$/),
        '✓ no duplicate numbers (3 skipped files)',
      ]);

      log.mockClear();
      expect(await commands.check.run([path, '--strict'])).toBe(1);
      expect(log.mock.calls.map((c) => c.join(' '))).toEqual([
        expect.stringMatching(/^✗ issues\/0002-Tax-Return\.md: skipped — /),
        expect.stringMatching(/^✗ issues\/0003-broken\.md: skipped — /),
        expect.stringMatching(/^✗ issues\/0004-unreadable\.md: skipped — /),
      ]);
    } finally {
      log.mockRestore();
    }
  });

  it('passes --strict when nothing is skipped', async () => {
    const path = await repo('beta');
    await writeFile(join(path, '.agents', 'issues', '0001-first.md'), '---\nid: 0001\ntitle: First\n---\n');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      expect(await commands.check.run([path, '--strict'])).toBe(0);
      expect(log.mock.calls.map((c) => c.join(' '))).toEqual(['✓ no duplicate numbers']);
    } finally {
      log.mockRestore();
    }
  });
});
