import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WatchHub } from '../server/watch';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'loopboard-watch-'));
  await mkdir(join(root, 'issues'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('WatchHub', () => {
  it('collapses a burst of writes into one change and stops when nobody listens', async () => {
    const hub = new WatchHub(60);
    let calls = 0;
    const unsubscribe = hub.subscribe(root, () => calls++);
    await wait(50);

    await writeFile(join(root, 'issues', '0001-a.md'), 'a');
    await writeFile(join(root, 'issues', '0002-b.md'), 'b');
    await writeFile(join(root, 'issues', '0001-a.md'), 'a2');
    await wait(400);

    expect(calls).toBe(1);
    unsubscribe();
    expect(hub.watching(root)).toBe(false);
  });

  it('ignores atomic-save temp files', async () => {
    const hub = new WatchHub(30);
    let calls = 0;
    const unsubscribe = hub.subscribe(root, () => calls++);
    await wait(50);
    await writeFile(join(root, 'issues', '0001-a.md.123.tmp'), 'x');
    await wait(250);
    unsubscribe();
    expect(calls).toBe(0);
  });
});
