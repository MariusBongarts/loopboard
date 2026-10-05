import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Helpers for driving the built `loopboard` binary as a user would.
const BIN = join(process.cwd(), 'bin', 'loopboard.js');

export interface Run {
  status: number;
  stdout: string;
  stderr: string;
}

export function sandbox(): { dir: string; config: string } {
  const dir = mkdtempSync(join(tmpdir(), 'loopboard-cli-e2e-'));
  return { dir, config: join(dir, 'config') };
}

export function repo(parent: string, name: string, root: '.agents' | 'ai' | null = '.agents'): string {
  const path = join(parent, name);
  mkdirSync(path, { recursive: true });
  if (root) {
    mkdirSync(join(path, root, 'issues'), { recursive: true });
    writeFileSync(join(path, root, 'issues', '0001-first.md'), '---\nid: 0001\ntitle: First\nstatus: todo\nassignee: agent\nlabels: []\n---\n\nBody.\n');
  }
  return path;
}

export function loopboard(args: string[], cwd: string, config: string): Run {
  const r = spawnSync(process.execPath, [BIN, ...args], { cwd, env: { ...process.env, LOOPBOARD_CONFIG_DIR: config }, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout, stderr: r.stderr };
}

export async function serve(args: string[], cwd: string, config: string): Promise<{ url: string; port: number; proc: ChildProcess }> {
  const proc = spawn(process.execPath, [BIN, '--no-open', ...args], { cwd, env: { ...process.env, LOOPBOARD_CONFIG_DIR: config } });
  let out = '';
  proc.stdout?.on('data', (d) => (out += d));
  proc.stderr?.on('data', (d) => (out += d));
  for (let i = 0; i < 100; i++) {
    const m = out.match(/http:\/\/127\.0\.0\.1:(\d+)\/w\/[\w-]+/);
    if (m) return { url: m[0], port: Number(m[1]), proc };
    await new Promise((r) => setTimeout(r, 100));
  }
  proc.kill();
  throw new Error(`loopboard didn't start:\n${out}`);
}

export function git(cwd: string, ...args: string[]): void {
  spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...args], { cwd, stdio: 'ignore' });
}
