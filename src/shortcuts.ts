// One registry for keyboard shortcuts: handlers match against it and the
// Help page lists it, so the two can't drift (#0014).
export interface Shortcut {
  keys: string[]; // KeyboardEvent.key values
  display: string;
  label: string;
  mod?: boolean; // needs ⌘ (macOS) or Ctrl
}

export const SHORTCUTS = {
  palette: { keys: ['k', 'K'], display: '⌘K', label: 'Command palette: jump anywhere, run any action', mod: true },
  create: { keys: ['c', 'C'], display: 'C', label: 'New issue' },
  search: { keys: ['/'], display: '/', label: 'Search the feed and projects' },
  next: { keys: ['j'], display: 'j', label: 'Next item in the feed' },
  prev: { keys: ['k'], display: 'k', label: 'Previous item in the feed' },
  sidebar: { keys: ['['], display: '[', label: 'Collapse or expand the sidebar' },
  help: { keys: ['?'], display: '?', label: 'Open Help' },
  close: { keys: ['Escape'], display: 'Esc', label: 'Close a menu, dialog or the issue panel; clear a search box' },
} satisfies Record<string, Shortcut>;

export type ShortcutId = keyof typeof SHORTCUTS;

export function isShortcut(e: KeyboardEvent, id: ShortcutId): boolean {
  const s: Shortcut = SHORTCUTS[id];
  if (s.mod ? !(e.metaKey || e.ctrlKey) : hasModifier(e)) return false;
  return s.keys.includes(e.key);
}

// Plain-key shortcuts never fire while typing or with modifiers held.
export function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

export function hasModifier(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey || e.altKey;
}

// Something that owns the keyboard is open: a dialog, a menu, the backlog
// drawer — or the issue panel, unless the caller is the panel itself.
export function overlayOpen(opts: { ignorePanel?: boolean } = {}): boolean {
  if (document.querySelector('.modal-backdrop, .menu, .backlog-drawer')) return true;
  return !opts.ignorePanel && document.querySelector('.issue-panel') !== null;
}
