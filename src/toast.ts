import { reactive } from 'vue';

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

// One small app-wide queue; Toasts.vue renders it.
export const toasts = reactive<Toast[]>([]);
let seq = 0;

export function toast(text: string, action?: Toast['action'], ms = 3200): void {
  const id = ++seq;
  toasts.push({ id, text, action });
  setTimeout(() => dismissToast(id), ms);
}

export function dismissToast(id: number): void {
  const i = toasts.findIndex((t) => t.id === id);
  if (i >= 0) toasts.splice(i, 1);
}
