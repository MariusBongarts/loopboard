<script setup lang="ts">
import { ref, watch } from 'vue';
import { addWorkspace, suggestPaths, type PathSuggestion } from '../api';
import type { WorkspaceSummary } from '../types';
import BaseDialog from './BaseDialog.vue';

// The server suggests folders as you type: a browser can't hand a local
// server an absolute path from a native picker (#0009).
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'added', w: WorkspaceSummary): void }>();
const path = ref('');
const suggestions = ref<PathSuggestion[]>([]);
const active = ref(-1);
const error = ref<string | null>(null);
const busy = ref(false);
let seq = 0;

watch(
  () => props.open,
  (v) => {
    if (!v) return;
    path.value = '~/';
    error.value = null;
    void load();
  },
);

async function load() {
  const mine = ++seq;
  try {
    const next = await suggestPaths(path.value);
    if (mine === seq) {
      suggestions.value = next;
      active.value = -1;
    }
  } catch {
    if (mine === seq) suggestions.value = [];
  }
}

watch(path, () => {
  error.value = null;
  void load();
});

function pick(s: PathSuggestion) {
  // Clear right away so an Enter before the next fetch submits instead of re-picking.
  suggestions.value = [];
  active.value = -1;
  path.value = `${s.path}/`;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' && suggestions.value.length) {
    e.preventDefault();
    active.value = (active.value + 1) % suggestions.value.length;
  } else if (e.key === 'ArrowUp' && suggestions.value.length) {
    e.preventDefault();
    active.value = active.value <= 0 ? suggestions.value.length - 1 : active.value - 1;
  } else if (e.key === 'Tab' && active.value >= 0) {
    e.preventDefault();
    pick(suggestions.value[active.value]);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (active.value >= 0) pick(suggestions.value[active.value]);
    else void submit();
  }
}

async function submit() {
  const value = path.value.trim().replace(/[\\/]+$/, '');
  if (!value || busy.value) return;
  busy.value = true;
  try {
    emit('added', await addWorkspace(value));
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <BaseDialog :open="props.open" label="Add workspace" eyebrow="Add workspace" wide @close="emit('close')">
    <h3>Open a repo</h3>
    <p>Pick the repo's root folder. loopboard finds its <code>.agents/</code> (or legacy <code>ai/</code>) folder.</p>
    <input
      v-model="path"
      class="ws-path"
      type="text"
      spellcheck="false"
      autocomplete="off"
      aria-label="Repo path"
      placeholder="~/repos/my-app"
      @keydown="onKeydown"
    />
    <ul v-if="suggestions.length" class="ws-suggest" role="listbox" aria-label="Folders">
      <li
        v-for="(s, i) in suggestions"
        :key="s.path"
        role="option"
        :aria-selected="i === active"
        :class="{ on: i === active }"
        @mousedown.prevent="pick(s)"
      >
        <span>{{ s.name }}/</span>
        <span v-if="s.hasRoot" class="ws-suggest-tag">has .agents</span>
      </li>
    </ul>
    <p v-if="error" class="ws-error" role="alert">{{ error }}</p>
    <template #actions>
      <button type="button" @click="emit('close')">Cancel</button>
      <button type="button" class="primary" :disabled="busy || !path.trim()" @click="submit">Add workspace</button>
    </template>
  </BaseDialog>
</template>
