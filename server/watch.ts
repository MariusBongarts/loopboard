import { lstatSync, readdirSync, watch, type FSWatcher } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

// "stale": the watcher died and changes may be missed until "ready" (#0072).
export type WatchEvent = "ready" | "change" | "stale";

type Listener = (event: WatchEvent) => void;
type WatchFn = (
  root: string,
  options: { recursive: true },
  onEvent: (event: string, filename: string | Buffer | null) => void,
) => FSWatcher;

export interface WatchOptions {
  debounceMs?: number;
  // Poll every root at this interval; 0 polls only roots the watcher can't follow.
  pollMs?: number;
  // The interval for those roots.
  linkedPollMs?: number;
  // First re-watch delay after a failure; doubles up to RETRY_MAX_MS.
  retryMs?: number;
  // A watcher that held this long starts the backoff over when it dies.
  holdMs?: number;
  watch?: WatchFn;
}

interface Entry {
  watcher: FSWatcher | null;
  listeners: Set<Listener>;
  timer: ReturnType<typeof setTimeout> | null;
  retry: ReturnType<typeof setTimeout> | null;
  failures: number;
  openedAt: number;
  // A polled root is followed even while its watcher is down.
  polled: boolean;
  poll: ReturnType<typeof setTimeout> | null;
  seen: string | null;
}

// Only markdown under the root can change what loopboard shows; directory
// events, editor swap files and atomic-save temp files are noise.
const RELEVANT = /\.md$/i;
const IGNORED = /(^|[\\/])(\.git|node_modules)([\\/]|$)/;

const RETRY_MAX_MS = 30_000;
const POLLED = ["issues", "projects", "specs"] as const;
const POLL_DEPTH = 3;
const POLL_MIN_MS = 250;
const POLL_FALLBACK_MS = 2000;

// LOOPBOARD_POLL_MS (#0072): for folders whose changes never reach fs.watch,
// e.g. on network or synced drives. Unset or invalid means no extra polling.
export function pollInterval(value: string | undefined): number {
  const ms = Number(value);
  return Number.isFinite(ms) && ms > 0 ? Math.max(Math.round(ms), POLL_MIN_MS) : 0;
}

function isLink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

// fs.watch reports nothing from behind a symlink (#0072). The polled folders,
// the archive and every project folder may be one.
function hasLinkedFolder(root: string): boolean {
  const projects = join(root, "projects");
  let folders: string[] = [];
  try {
    folders = readdirSync(projects);
  } catch {
    // No projects/: nothing more to look at.
  }
  return [...POLLED.map((dir) => join(root, dir)), join(root, "issues", "_archive"), ...folders.map((name) => join(projects, name))].some(isLink);
}

async function stamps(dir: string, depth: number): Promise<string[]> {
  const names = await readdir(dir).catch((): string[] => []);
  const found = await Promise.all(
    names.sort().map(async (name) => {
      const path = join(dir, name);
      const info = await stat(path).catch(() => null);
      if (info?.isFile() && RELEVANT.test(name)) return [`${path}:${info.mtimeMs}`];
      if (info?.isDirectory() && depth < POLL_DEPTH && !IGNORED.test(name)) return stamps(path, depth + 1);
      return [];
    }),
  );
  return found.flat();
}

// What a poll compares (#0072): the markdown files in issues/, projects/ and
// specs/ with their mtimes, so a new count or a newer file reads as a change.
// stat follows symlinks.
export async function snapshot(root: string): Promise<string> {
  const found = await Promise.all(POLLED.map((dir) => stamps(join(root, dir), 1)));
  return found.flat().join("\n");
}

// One recursive watcher per root while at least one client listens (#0010).
// Bursts of writes (an agent editing several files) collapse into one event.
export class WatchHub {
  private entries = new Map<string, Entry>();
  private readonly debounceMs: number;
  private readonly pollMs: number;
  private readonly linkedPollMs: number;
  private readonly retryMs: number;
  private readonly holdMs: number;
  private readonly watchFn: WatchFn;

  constructor(options: WatchOptions = {}) {
    this.debounceMs = options.debounceMs ?? 150;
    this.pollMs = options.pollMs ?? 0;
    this.linkedPollMs = options.linkedPollMs ?? POLL_FALLBACK_MS;
    this.retryMs = options.retryMs ?? 1000;
    this.holdMs = options.holdMs ?? RETRY_MAX_MS;
    this.watchFn = options.watch ?? watch;
  }

  subscribe(root: string, listener: Listener): () => void {
    let entry = this.entries.get(root);
    if (!entry) {
      const pollMs = this.pollMs || (hasLinkedFolder(root) ? this.linkedPollMs : 0);
      entry = { watcher: null, listeners: new Set(), timer: null, retry: null, failures: 0, openedAt: 0, polled: pollMs > 0, poll: null, seen: null };
      this.entries.set(root, entry);
      if (!this.open(root, entry)) this.retryLater(root, entry);
      if (pollMs) this.poll(root, entry, pollMs);
    }
    entry.listeners.add(listener);
    return () => {
      const e = this.entries.get(root);
      if (!e) return;
      e.listeners.delete(listener);
      if (e.listeners.size === 0) this.close(root);
    };
  }

  // False while a root's watcher is down and waiting for its next retry,
  // unless the root is polled: its changes still arrive.
  watching(root: string): boolean {
    const entry = this.entries.get(root);
    return !!entry && (!!entry.watcher || entry.polled);
  }

  private open(root: string, entry: Entry): boolean {
    try {
      const watcher = this.watchFn(root, { recursive: true }, (_event, filename) => {
        const name = filename ? String(filename) : "";
        if (name && (!RELEVANT.test(name) || IGNORED.test(name))) return;
        this.changed(entry);
      });
      watcher.on("error", () => this.fail(root, entry, watcher));
      entry.watcher = watcher;
      entry.openedAt = Date.now();
      return true;
    } catch {
      return false;
    }
  }

  // A dead watcher (#0072): tell the clients, then re-watch with backoff. One
  // that held for a while starts the backoff over; one that keeps dying waits.
  private fail(root: string, entry: Entry, watcher: FSWatcher): void {
    if (entry.watcher !== watcher) return;
    watcher.close();
    entry.watcher = null;
    if (Date.now() - entry.openedAt > this.holdMs) entry.failures = 0;
    if (!entry.polled) this.emit(entry, "stale");
    this.retryLater(root, entry);
  }

  private retryLater(root: string, entry: Entry): void {
    const delay = Math.min(this.retryMs * 2 ** entry.failures, RETRY_MAX_MS);
    entry.failures++;
    entry.retry = setTimeout(() => {
      entry.retry = null;
      if (!this.open(root, entry)) this.retryLater(root, entry);
      else if (!entry.polled) this.emit(entry, "ready");
    }, delay);
  }

  // Folders the watcher can't follow (#0072): a changed snapshot counts like
  // a watch event. The next poll starts only after this one finished.
  private poll(root: string, entry: Entry, every: number): void {
    const tick = async (): Promise<void> => {
      const seen = await snapshot(root);
      if (this.entries.get(root) !== entry) return;
      if (entry.seen !== null && seen !== entry.seen) this.changed(entry);
      entry.seen = seen;
      entry.poll = setTimeout(() => void tick(), every);
    };
    void tick();
  }

  private changed(entry: Entry): void {
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      entry.timer = null;
      this.emit(entry, "change");
    }, this.debounceMs);
  }

  private emit(entry: Entry, event: WatchEvent): void {
    for (const l of entry.listeners) l(event);
  }

  private close(root: string): void {
    const e = this.entries.get(root);
    if (!e) return;
    for (const t of [e.timer, e.retry, e.poll]) if (t) clearTimeout(t);
    e.watcher?.close();
    e.watcher = null;
    this.entries.delete(root);
  }
}

export const watchHub = new WatchHub({ pollMs: pollInterval(process.env.LOOPBOARD_POLL_MS) });
