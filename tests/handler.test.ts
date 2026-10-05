import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { request } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createAppServer } from '../server/serve';

let tmp: string;
let server: Server;
let port: number;

interface Reply {
  status: number;
  body: string;
}

function call(method: string, path: string, opts: { host?: string; origin?: string; body?: unknown } = {}): Promise<Reply> {
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
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
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
});
