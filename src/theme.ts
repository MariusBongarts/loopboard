import { ref } from 'vue';
import { readStored, writeStored } from './storage';

// Light / dark / follow the system (#0034). index.html sets the attribute
// before first paint; this keeps it in sync afterwards.
export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'loopboard.theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

function readChoice(): ThemeChoice {
  const v = readStored(KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

export const themeChoice = ref<ThemeChoice>(readChoice());

function apply() {
  const dark = themeChoice.value === 'dark' || (themeChoice.value === 'system' && media.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

media.addEventListener('change', apply);
apply();

export function setTheme(choice: ThemeChoice): void {
  themeChoice.value = choice;
  writeStored(KEY, choice === 'system' ? null : choice);
  apply();
}

export function cycleTheme(): ThemeChoice {
  const next: ThemeChoice = themeChoice.value === 'system' ? 'dark' : themeChoice.value === 'dark' ? 'light' : 'system';
  setTheme(next);
  return next;
}
