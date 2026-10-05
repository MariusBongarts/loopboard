import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, type LaunchResult } from '../server/cli';
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
