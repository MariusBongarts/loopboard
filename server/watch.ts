import { watch, type FSWatcher } from "node:fs";

type Listener = () => void;

interface Entry {
  watcher: FSWatcher | null;
  listeners: Set<Listener>;
  timer: ReturnType<typeof setTimeout> | null;
}

// Only markdown under the root can change what loopboard shows; directory
// events, editor swap files and atomic-save temp files are noise.
const RELEVANT = /\.md$/i;
const IGNORED = /(^|[\\/])(\.git|node_modules)([\\/]|$)/;

// One recursive watcher per root while at least one client listens (#0010).
// Bursts of writes (an agent editing several files) collapse into one event.
export class WatchHub {
  private entries = new Map<string, Entry>();

  constructor(private readonly debounceMs = 150) {}

  subscribe(root: string, listener: Listener): () => void {
    let entry = this.entries.get(root);
    if (!entry) {
      entry = { watcher: null, listeners: new Set(), timer: null };
      this.entries.set(root, entry);
      const current = entry;
      try {
        current.watcher = watch(root, { recursive: true }, (_event, filename) => {
          const name = filename ? String(filename) : "";
          if (name && (!RELEVANT.test(name) || IGNORED.test(name))) return;
          if (current.timer) clearTimeout(current.timer);
          current.timer = setTimeout(() => {
            current.timer = null;
            for (const l of current.listeners) l();
          }, this.debounceMs);
        });
        current.watcher.on("error", () => this.close(root));
      } catch {
        current.watcher = null;
      }
    }
    entry.listeners.add(listener);
    return () => {
      const e = this.entries.get(root);
      if (!e) return;
      e.listeners.delete(listener);
      if (e.listeners.size === 0) this.close(root);
    };
  }

  watching(root: string): boolean {
    return this.entries.has(root);
  }

  private close(root: string): void {
    const e = this.entries.get(root);
    if (!e) return;
    if (e.timer) clearTimeout(e.timer);
    e.watcher?.close();
    this.entries.delete(root);
  }
}

export const watchHub = new WatchHub();
