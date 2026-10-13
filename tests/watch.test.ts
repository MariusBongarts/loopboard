import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { watch, type FSWatcher } from 'node:fs';
import { mkdir, mkdtemp, rename, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pollInterval, snapshot, WatchHub, type WatchEvent, type WatchOptions } from '../server/watch';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'loopboard-watch-'));
  await mkdir(join(root, 'issues'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until(check: () => boolean, ms = 3000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!check() && Date.now() < deadline) await wait(10);
}

// The real fs.watch, keeping every watcher it opened so a test can break one.
function recordingWatch() {
  const opened: FSWatcher[] = [];
  const watchFn: NonNullable<WatchOptions['watch']> = (...args) => {
    const watcher = watch(...args);
    opened.push(watcher);
    return watcher;
  };
  return { opened, watchFn };
}

describe('WatchHub', () => {
  it('collapses a burst of writes into one change and stops when nobody listens', async () => {
    const hub = new WatchHub({ debounceMs: 60 });
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
    const hub = new WatchHub({ debounceMs: 30 });
    let calls = 0;
    const unsubscribe = hub.subscribe(root, () => calls++);
    await wait(50);
    await writeFile(join(root, 'issues', '0001-a.md.123.tmp'), 'x');
    await wait(250);
    unsubscribe();
    expect(calls).toBe(0);
  });

  // #0072
  it('tells its listeners when the watcher dies, then watches again', async () => {
    const { opened, watchFn } = recordingWatch();
    const hub = new WatchHub({ debounceMs: 30, retryMs: 40, watch: watchFn });
    const events: WatchEvent[] = [];
    const unsubscribe = hub.subscribe(root, (e) => events.push(e));
    await wait(50);
    expect(hub.watching(root)).toBe(true);

    opened[0].emit('error', new Error('EPERM: operation not permitted, watch'));
    expect(events).toEqual(['stale']);
    expect(hub.watching(root)).toBe(false);

    await until(() => events.includes('ready'));
    expect(events).toEqual(['stale', 'ready']);
    expect(opened).toHaveLength(2);
    expect(hub.watching(root)).toBe(true);

    // The new watcher delivers changes again.
    await wait(50);
    await writeFile(join(root, 'issues', '0001-a.md'), 'a');
    await until(() => events.includes('change'));
    expect(events).toEqual(['stale', 'ready', 'change']);

    unsubscribe();
    expect(hub.watching(root)).toBe(false);
  });

  it('keeps trying until a root it could not watch is back', async () => {
    const gone = join(root, 'gone');
    const hub = new WatchHub({ debounceMs: 30, retryMs: 20 });
    const events: WatchEvent[] = [];
    const unsubscribe = hub.subscribe(gone, (e) => events.push(e));
    expect(hub.watching(gone)).toBe(false);

    await wait(200);
    expect(events).toEqual([]);
    await mkdir(gone);
    await until(() => events.includes('ready'));
    expect(hub.watching(gone)).toBe(true);
    unsubscribe();
  });

  it('backs off while a watcher keeps dying', async () => {
    const { opened, watchFn } = recordingWatch();
    const hub = new WatchHub({
      retryMs: 20,
      watch: (...args) => {
        const watcher = watchFn(...args);
        setTimeout(() => watcher.emit('error', new Error('ENOSPC')), 1);
        return watcher;
      },
    });
    const unsubscribe = hub.subscribe(root, () => {});
    // Retries after 20, 40, 80, 160 ms — not every 20 ms.
    await wait(330);
    unsubscribe();
    expect(opened.length).toBeGreaterThanOrEqual(3);
    expect(opened.length).toBeLessThanOrEqual(6);

    const before = opened.length;
    await wait(200);
    expect(opened).toHaveLength(before);
  });

  it('polls issues/ and projects/ when asked to', async () => {
    await mkdir(join(root, 'projects', '01-demo'), { recursive: true });
    await writeFile(join(root, 'issues', '0001-a.md'), 'a');
    // A watcher that never reports anything, like some network folders.
    const hub = new WatchHub({ debounceMs: 20, pollMs: 40, watch: (dir) => watch(dir, () => {}) });
    const events: WatchEvent[] = [];
    const unsubscribe = hub.subscribe(root, (e) => events.push(e));
    await wait(120);
    expect(events).toEqual([]);

    await writeFile(join(root, 'projects', '01-demo', 'wip.md'), 'wip');
    await until(() => events.length > 0);
    expect(events).toContain('change');

    // Same file count, newer mtime.
    await wait(120);
    const seen = events.length;
    const later = new Date(Date.now() + 5000);
    await utimes(join(root, 'issues', '0001-a.md'), later, later);
    await until(() => events.length > seen);
    expect(events.length).toBeGreaterThan(seen);
    expect(new Set(events)).toEqual(new Set(['change']));

    unsubscribe();
    const stopped = events.length;
    await writeFile(join(root, 'issues', '0002-b.md'), 'b');
    await wait(150);
    expect(events).toHaveLength(stopped);
  });

  it.skipIf(process.platform === 'win32')('falls back to polling when issues/ is a symlink', async () => {
    const target = await mkdtemp(join(tmpdir(), 'loopboard-linked-'));
    try {
      await rm(join(root, 'issues'), { recursive: true });
      await symlink(target, join(root, 'issues'), 'dir');
      const hub = new WatchHub({ debounceMs: 20 });
      const events: WatchEvent[] = [];
      const unsubscribe = hub.subscribe(root, (e) => events.push(e));
      await wait(100);

      await writeFile(join(target, '0001-a.md'), 'a');
      await until(() => events.length > 0, 4000);
      unsubscribe();
      expect(events).toEqual(['change']);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });
});

describe('snapshot', () => {
  it('changes with the file count, an mtime and a rename — not with other files', async () => {
    await mkdir(join(root, 'issues', '_archive'));
    await mkdir(join(root, 'specs'));
    await writeFile(join(root, 'issues', '0001-a.md'), 'a');
    const first = await snapshot(root);
    expect(await snapshot(root)).toBe(first);

    await writeFile(join(root, 'specs', '01-a.md'), 'spec');
    await writeFile(join(root, 'issues', 'notes.txt'), 'x');
    expect(await snapshot(root)).toBe(first);

    await writeFile(join(root, 'issues', '_archive', '0002-b.md'), 'b');
    const added = await snapshot(root);
    expect(added).not.toBe(first);

    const later = new Date(Date.now() + 5000);
    await utimes(join(root, 'issues', '0001-a.md'), later, later);
    const touched = await snapshot(root);
    expect(touched).not.toBe(added);

    await rename(join(root, 'issues', '0001-a.md'), join(root, 'issues', '0001-renamed.md'));
    expect(await snapshot(root)).not.toBe(touched);
  });

  it('reads a root without issues/ or projects/ as empty', async () => {
    expect(await snapshot(join(root, 'missing'))).toBe('');
  });
});

describe('pollInterval', () => {
  it('reads LOOPBOARD_POLL_MS and ignores anything that is not a positive number', () => {
    expect(pollInterval('3000')).toBe(3000);
    expect(pollInterval('10')).toBe(250);
    for (const off of [undefined, '', '0', '-5', 'fast']) expect(pollInterval(off)).toBe(0);
  });
});
