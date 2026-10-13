import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { request } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { latestMigration } from '../server/migrations';
import { packageRoot } from '../server/paths';
import { createAppServer } from '../server/serve';
import { watchHub } from '../server/watch';

let tmp: string;
let server: Server;
let port: number;

interface Reply {
  status: number;
  body: string;
  headers: Record<string, string | string[] | undefined>;
}

function call(
  method: string,
  path: string,
  opts: { host?: string; origin?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const data = opts.body === undefined ? undefined : JSON.stringify(opts.body);
    const req = request(
      {
        host: '127.0.0.1',
        port,
        method,
        path,
        headers: {
          host: opts.host ?? `localhost:${port}`,
          ...(opts.origin ? { origin: opts.origin } : {}),
          ...(data ? { 'content-type': 'application/json' } : {}),
          ...opts.headers,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body, headers: res.headers }));
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Follows a Server-Sent Events stream; returns the event names so far and a stop.
function follow(path: string): { events: string[]; stop: () => void } {
  const events: string[] = [];
  const req = request({ host: '127.0.0.1', port, path, headers: { host: `localhost:${port}` } }, (res) => {
    let text = '';
    res.on('data', (c) => {
      text += c;
      events.splice(0, events.length, ...[...text.matchAll(/^event: (\w+)$/gm)].map((m) => m[1]));
    });
  });
  req.on('error', () => {});
  req.end();
  return { events, stop: () => req.destroy() };
}

async function until(check: () => boolean, ms = 4000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!check() && Date.now() < deadline) await new Promise((r) => setTimeout(r, 20));
}

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'loopboard-api-'));
  const repo = join(tmp, 'demo');
  await mkdir(join(repo, '.agents', 'issues'), { recursive: true });
  await writeFile(
    join(repo, '.agents', 'issues', '0001-first.md'),
    '---\nid: 0001\ntitle: First\nstatus: todo\nassignee: agent\nlabels: []\n---\n\nBody.\n',
  );
  const client = join(tmp, 'client');
  await mkdir(client);
  await writeFile(join(client, 'index.html'), '<!doctype html><title>loopboard</title>');
  await mkdir(join(client, 'media'));
  await writeFile(join(client, 'media', 'clip.mp4'), Buffer.from(Array.from({ length: 100 }, (_, i) => i)));
  server = createAppServer({ configDir: join(tmp, 'config'), clientDir: client, port: 0 });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  server.close();
  await rm(tmp, { recursive: true, force: true });
});

describe('API over HTTP', () => {
  it('registers a workspace and serves its data', async () => {
    const added = await call('POST', '/api/workspaces', { body: { path: join(tmp, 'demo') } });
    expect(added.status).toBe(201);
    expect(JSON.parse(added.body).workspace).toMatchObject({ id: 'demo', available: true, issueCount: 1 });

    const data = await call('GET', '/api/w/demo/data');
    expect(JSON.parse(data.body).issues.map((i: { id: string }) => i.id)).toEqual(['0001']);
  });

  it('rewrites an issue through the workspace route', async () => {
    const res = await call('PATCH', '/api/w/demo/issues/0001', { body: { status: 'in-progress' } });
    expect(res.status).toBe(200);
    expect(await readFile(join(tmp, 'demo', '.agents', 'issues', '0001-first.md'), 'utf8')).toContain(
      'status: in-progress',
    );
  });

  it('answers 404 for an unknown workspace and 422 for a folder without a root', async () => {
    expect((await call('GET', '/api/w/nope/data')).status).toBe(404);
    await mkdir(join(tmp, 'plain'), { recursive: true });
    expect((await call('POST', '/api/workspaces', { body: { path: join(tmp, 'plain') } })).status).toBe(422);
  });

  it('rejects a foreign Host header (DNS rebinding)', async () => {
    expect((await call('GET', '/api/workspaces', { host: `evil.example:${port}` })).status).toBe(403);
  });

  it('rejects writes from a foreign Origin but allows its own', async () => {
    const body = { status: 'todo' };
    expect((await call('PATCH', '/api/w/demo/issues/0001', { origin: 'https://evil.example', body })).status).toBe(403);
    expect((await call('PATCH', '/api/w/demo/issues/0001', { origin: `http://localhost:${port}`, body })).status).toBe(200);
  });

  it('serves index.html for client routes and refuses path traversal', async () => {
    expect((await call('GET', '/w/demo/specs')).body).toContain('<title>loopboard</title>');
    expect((await call('GET', '/../package.json')).body).not.toContain('"name"');
  });

  it('stores saved views per workspace in the user config', async () => {
    const views = [{ id: 'v1', name: 'Bugs in review', query: { status: 'in-review', label: 'bug' } }];
    expect((await call('PUT', '/api/w/demo/views', { body: { views } })).status).toBe(200);
    expect(JSON.parse((await call('GET', '/api/w/demo/views')).body)).toEqual({ views });
    expect((await call('PUT', '/api/w/demo/views', { body: { views: [{ id: 'x' }] } })).status).toBe(400);
  });

  it('suggests folders, marking ones with a root', async () => {
    const res = await call('GET', `/api/fs/suggest?path=${encodeURIComponent(join(tmp, 'de'))}`);
    expect(JSON.parse(res.body).suggestions).toEqual([{ name: 'demo', path: join(tmp, 'demo'), hasRoot: true }]);
  });

  it('reports each harness’s migration level for the upgrade guide', async () => {
    await writeFile(join(tmp, 'demo', 'AGENTS.md'), '# Demo\n\n<!-- loopboard:migration M001 -->\n');
    const res = await call('GET', '/api/harness');
    expect(res.status).toBe(200);
    const info = JSON.parse(res.body);
    expect(info).toMatchObject({ packagePath: packageRoot(), latest: latestMigration(packageRoot()) });
    expect(info.migrations[0]).toMatchObject({ id: 'M001', date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    expect(info.workspaces).toEqual([
      expect.objectContaining({ id: 'demo', level: 'M001', status: 'behind', behind: info.migrations.length - 1, legacy: false }),
    ]);
  });

  it('serves media with byte ranges', async () => {
    const whole = await call('GET', '/media/clip.mp4');
    expect(whole).toMatchObject({ status: 200, headers: { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'content-length': '100' } });
    const part = await call('GET', '/media/clip.mp4', { headers: { range: 'bytes=10-19' } });
    expect(part).toMatchObject({ status: 206, headers: { 'content-range': 'bytes 10-19/100', 'content-length': '10' } });
    expect((await call('GET', '/media/clip.mp4', { headers: { range: 'bytes=200-' } })).status).toBe(416);
  });

  // #0072
  it('says on the event stream whether the root is being watched', async () => {
    const demo = follow('/api/w/demo/events');
    await until(() => demo.events.length > 0);
    demo.stop();
    expect(demo.events).toEqual(['ready']);

    const repo = join(tmp, 'away');
    await mkdir(join(repo, '.agents', 'issues'), { recursive: true });
    const added = await call('POST', '/api/workspaces', { body: { path: repo } });
    const { root } = JSON.parse(added.body).workspace as { root: string };
    await rm(root, { recursive: true });
    const away = follow('/api/w/away/events');
    try {
      await until(() => away.events.length > 0);
      expect(away.events).toEqual(['stale']);
      // The hub re-watches on its own once the folder is back.
      await mkdir(join(root, 'issues'), { recursive: true });
      await until(() => away.events.length > 1);
      expect(away.events).toEqual(['stale', 'ready']);
    } finally {
      away.stop();
      await until(() => !watchHub.watching(root));
      await call('DELETE', '/api/workspaces/away');
    }
  });
});
