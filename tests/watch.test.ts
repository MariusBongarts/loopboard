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

  it('starts the backoff over once a watcher held for a while', async () => {
    const { opened, watchFn } = recordingWatch();
    const hub = new WatchHub({ retryMs: 30, holdMs: 100, watch: watchFn });
    const unsubscribe = hub.subscribe(root, () => {});
    const die = () => opened.at(-1)!.emit('error', new Error('EPERM'));
    // Three quick deaths: retries after 30, 60 and 120 ms; the next would wait 240.
    for (let n = 1; n <= 3; n++) {
      die();
      await until(() => opened.length === n + 1);
    }
    expect(opened).toHaveLength(4);

    await wait(150);
    const died = Date.now();
    die();
    await until(() => opened.length === 5);
    unsubscribe();
    expect(Date.now() - died).toBeLessThan(150);
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

  // A polled root is followed although its watcher is down, so it isn't stale.
  it('counts a polled root as watched while the watcher is down', async () => {
    const hub = new WatchHub({
      debounceMs: 20,
      pollMs: 40,
      retryMs: 20,
      watch: () => {
        throw new Error('ENOSYS: function not implemented, watch');
      },
    });
    const events: WatchEvent[] = [];
    const unsubscribe = hub.subscribe(root, (e) => events.push(e));
    expect(hub.watching(root)).toBe(true);
    await wait(120);

    await writeFile(join(root, 'issues', '0001-a.md'), 'a');
    await until(() => events.length > 0);
    expect(new Set(events)).toEqual(new Set(['change']));
    expect(hub.watching(root)).toBe(true);

    unsubscribe();
    expect(hub.watching(root)).toBe(false);
  });

  // fs.watch reports nothing from behind a symlink, wherever under the root it is.
  describe.skipIf(process.platform === 'win32')('falls back to polling', () => {
    let target: string;

    beforeEach(async () => {
      target = await mkdtemp(join(tmpdir(), 'loopboard-linked-'));
    });

    afterEach(async () => {
      await rm(target, { recursive: true, force: true });
    });

    it.each([
      ['issues/', 'issues', '0001-a.md'],
      ['projects/', 'projects', '01-demo/wip.md'],
      ['specs/', 'specs', '01-running.md'],
      ['the archive', 'issues/_archive', '0001-a.md'],
      ['one project folder', 'projects/01-demo', 'wip.md'],
    ])('when %s is a symlink', async (_what, link, file) => {
      await rm(join(root, link), { recursive: true, force: true });
      await mkdir(join(root, link, '..'), { recursive: true });
      await symlink(target, join(root, link), 'dir');
      const hub = new WatchHub({ debounceMs: 20, linkedPollMs: 50 });
      const events: WatchEvent[] = [];
      const unsubscribe = hub.subscribe(root, (e) => events.push(e));
      await wait(150);
      expect(events).toEqual([]);

      await mkdir(join(target, file, '..'), { recursive: true });
      await writeFile(join(target, file), 'a');
      await until(() => events.length > 0);
      unsubscribe();
      expect(events).toEqual(['change']);
    });

    it('not when nothing is linked', async () => {
      await mkdir(join(root, 'projects', '01-demo'), { recursive: true });
      // A watcher that never reports anything: only a poll could see the file.
      const hub = new WatchHub({ debounceMs: 20, linkedPollMs: 50, watch: (dir) => watch(dir, () => {}) });
      const events: WatchEvent[] = [];
      const unsubscribe = hub.subscribe(root, (e) => events.push(e));
      await wait(100);
      await writeFile(join(root, 'issues', '0001-a.md'), 'a');
      await wait(250);
      unsubscribe();
      expect(events).toEqual([]);
    });
  });
});

describe('snapshot', () => {
  it('changes with the file count, an mtime and a rename — not with other files', async () => {
    await mkdir(join(root, 'issues', '_archive'));
    await mkdir(join(root, 'specs'));
    await writeFile(join(root, 'issues', '0001-a.md'), 'a');
    const first = await snapshot(root);
    expect(await snapshot(root)).toBe(first);

    await mkdir(join(root, 'architecture'));
    await writeFile(join(root, 'architecture', 'overview.md'), 'doc');
    await writeFile(join(root, 'issues', 'notes.txt'), 'x');
    expect(await snapshot(root)).toBe(first);

    await writeFile(join(root, 'specs', '01-a.md'), 'spec');
    const spec = await snapshot(root);
    expect(spec).not.toBe(first);

    await writeFile(join(root, 'issues', '_archive', '0002-b.md'), 'b');
    const added = await snapshot(root);
    expect(added).not.toBe(spec);

    const later = new Date(Date.now() + 5000);
    await utimes(join(root, 'issues', '0001-a.md'), later, later);
    const touched = await snapshot(root);
    expect(touched).not.toBe(added);

    await rename(join(root, 'issues', '0001-a.md'), join(root, 'issues', '0001-renamed.md'));
    expect(await snapshot(root)).not.toBe(touched);
  });

  it('reads a root without issues/, projects/ or specs/ as empty', async () => {
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
