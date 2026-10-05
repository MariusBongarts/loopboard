import { ref } from 'vue';
import { readStored, writeStored } from './storage';

// Drag-resizable panes (#0048): rail, feed and issue panel share one model —
// pointer drag, arrow keys on the focused separator, double-click to reset,
// clamped and remembered per browser.
export interface ResizeOptions {
  key: string;
  min: number;
  max: number;
  initial: number;
  // Which edge of the pane the handle sits on: dragging it outward grows the pane.
  edge: 'right' | 'left';
}

export function clampSize(n: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, n)));
}

export interface Resizer {
  size: { value: number };
  min: number;
  max: number;
  onPointerdown(e: PointerEvent): void;
  onKeydown(e: KeyboardEvent): void;
  reset(): void;
}

export function useResizable(opts: ResizeOptions): Resizer {
  const stored = Number(readStored(opts.key));
  const size = ref(stored ? clampSize(stored, opts.min, opts.max) : opts.initial);
  const set = (n: number) => (size.value = clampSize(n, opts.min, opts.max));
  const save = () => writeStored(opts.key, String(size.value));

  function onPointerdown(e: PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const start = size.value;
    const sign = opts.edge === 'right' ? 1 : -1;
    document.body.classList.add('is-resizing');
    const move = (ev: PointerEvent) => set(start + sign * (ev.clientX - startX));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.classList.remove('is-resizing');
      save();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function onKeydown(e: KeyboardEvent) {
    const step = e.shiftKey ? 64 : 16;
    const grow = opts.edge === 'right' ? 'ArrowRight' : 'ArrowLeft';
    const shrink = opts.edge === 'right' ? 'ArrowLeft' : 'ArrowRight';
    if (e.key === grow) set(size.value + step);
    else if (e.key === shrink) set(size.value - step);
    else if (e.key === 'Home') set(opts.min);
    else if (e.key === 'End') set(opts.max);
    else return;
    e.preventDefault();
    save();
  }

  function reset() {
    size.value = opts.initial;
    writeStored(opts.key, null);
  }

  return { size, min: opts.min, max: opts.max, onPointerdown, onKeydown, reset };
}
