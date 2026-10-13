import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { configDir } from '../server/paths';

const REPO = resolve(__dirname, '..');
let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'loopboard-isolation-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

// Vitest starts a Vite server from vite.config.ts, and the dev plugin used to
// register the checkout in the user's workspace registry on every run (#0111).
describe('a Vitest run', () => {
  it('writes nothing to the config directory it was started with', () => {
    const config = join(tmp, 'config');
    // What a plain `pnpm test` starts with: nothing this run added.
    const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(VITEST|VITE_|TEST$|NODE_ENV$)/.test(name)));
    const run = spawnSync(process.execPath, [join(REPO, 'node_modules', 'vitest', 'vitest.mjs'), 'run', 'tests/args.test.ts'], {
      cwd: REPO,
      env: { ...env, LOOPBOARD_CONFIG_DIR: config },
      encoding: 'utf8',
    });

    expect(run.status, run.stderr).toBe(0);
    expect(existsSync(config)).toBe(false);
  }, 60_000);

  it('gives tests a config directory that is not the one it was started with', () => {
    expect(configDir()).toBe(join(tmpdir(), 'loopboard-vitest'));
  });
});
