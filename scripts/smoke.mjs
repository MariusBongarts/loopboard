// Release smoke test (#0035): pack the tarball, then — as a user would —
// `npx loopboard init` in a fresh repo, start the server and ask it for data.
// Runs on macOS, Linux and Windows in CI. Usage: node scripts/smoke.mjs
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const win = process.platform === 'win32';
const run = (cmd, args, opts) => execFileSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', shell: win, ...opts });

const work = mkdtempSync(join(tmpdir(), 'loopboard-smoke-'));
const repo = join(work, 'my-app');
const config = join(work, 'config');
mkdirSync(repo);
let server;
try {
  run('npm', ['pack', '--pack-destination', work]);
  const tgz = join(work, readdirSync(work).find((f) => f.endsWith('.tgz')));
  const files = run('tar', ['-tzf', tgz]).split('\n');
  const forbidden = files.filter((f) => /package\/(tests|src|server|\.agents\/issues\/\d|\.agents\/projects\/\d|dist)\//.test(f));
  if (forbidden.length) throw new Error(`tarball ships files it shouldn't:\n${forbidden.join('\n')}`);

  const env = { ...process.env, LOOPBOARD_CONFIG_DIR: config, npm_config_yes: 'true' };
  const init = run('npx', ['--yes', `--package=${tgz}`, 'loopboard', 'init'], { cwd: repo, env });
  if (!/created \(\d+\)/.test(init)) throw new Error(`init printed:\n${init}`);

  const port = 5300 + Math.floor(Math.random() * 400);
  server = spawn('npx', ['--yes', `--package=${tgz}`, 'loopboard', '--no-open', '--port', String(port)], { cwd: repo, env, shell: win, stdio: 'pipe' });
  let output = '';
  server.stdout.on('data', (d) => (output += d));
  server.stderr.on('data', (d) => (output += d));
  const deadline = Date.now() + 90_000;
  let url;
  while (!url && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
    url = output.match(/http:\/\/127\.0\.0\.1:(\d+)\/w\/([\w-]+)/);
  }
  if (!url) throw new Error(`server didn't start:\n${output}`);
  const [, boundPort, id] = url;
  const health = await (await fetch(`http://127.0.0.1:${boundPort}/api/health`)).json();
  const data = await (await fetch(`http://127.0.0.1:${boundPort}/api/w/${id}/data`)).json();
  const page = await (await fetch(`http://127.0.0.1:${boundPort}/w/${id}`)).text();
  if (health.name !== 'loopboard' || !Array.isArray(data.issues) || !page.includes('<div id="app">')) {
    throw new Error('unexpected responses from the packed server');
  }
  console.log(`✓ smoke: ${files.length} files packed, init ok, server ${health.version} answered for workspace "${id}"`);
} finally {
  if (server) server.kill();
  rmSync(work, { recursive: true, force: true });
}
