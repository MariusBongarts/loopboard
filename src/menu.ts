import { shallowRef, type Component } from 'vue';
import type { Assignee, Status } from './types';

// One menu at a time (#0052, #0055): property pickers and right-click menus
// both open through here; MenuHost renders it.
export interface MenuItem {
  id: string;
  label: string;
  icon?: Component;
  status?: Status;
  assignee?: Assignee;
  // A tone slug drawn as a dot (labels) or a square (projects).
  tone?: string;
  toneShape?: 'dot' | 'square';
  hint?: string;
  checked?: boolean;
  danger?: boolean;
  disabled?: boolean;
  // Multi-select menus stay open after a pick.
  keepOpen?: boolean;
  children?: () => MenuEntry[];
  run?: () => void;
}

export type MenuEntry = MenuItem | 'separator';

export interface MenuRequest {
  label: string;
  items: () => MenuEntry[];
  // An element to open below, or a pointer position.
  at: HTMLElement | { x: number; y: number };
  // Placeholder of a filter box shown at the top.
  filter?: string;
  // Offered when the filter text names nothing that exists yet.
  create?: (text: string) => MenuItem | null;
}

export const activeMenu = shallowRef<MenuRequest | null>(null);

export function openMenu(request: MenuRequest): void {
  activeMenu.value = request;
}

// Open below the clicked element (or at the pointer when there is none).
export function anchorOf(e: MouseEvent): MenuRequest['at'] {
  return e.currentTarget instanceof HTMLElement ? e.currentTarget : { x: e.clientX, y: e.clientY };
}

export function closeMenu(): void {
  activeMenu.value = null;
}

// Every query word must appear in the label or hint; separators drop out
// while filtering.
export function filterEntries(entries: MenuEntry[], query: string): MenuEntry[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return entries;
  return entries.filter(
    (e): e is MenuItem => e !== 'separator' && words.every((w) => `${e.label} ${e.hint ?? ''}`.toLowerCase().includes(w)),
  );
}
