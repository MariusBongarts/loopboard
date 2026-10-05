<script setup lang="ts">
import { EDITORS, EDITOR_LABEL, editorChoice, setEditor, type EditorChoice } from '../editor';
import { setTheme, themeChoice, type ThemeChoice } from '../theme';
import BaseDialog from './BaseDialog.vue';
import Segmented from './Segmented.vue';

// Per-browser preferences (#0047, #0049): theme and the editor to open files in.
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];
const editors = EDITORS.map((value) => ({ value, label: EDITOR_LABEL[value] }));
</script>

<template>
  <BaseDialog :open="props.open" label="Settings" eyebrow="Settings" @close="emit('close')">
    <div class="settings">
      <div class="settings-row">
        <div>
          <div class="settings-name">Theme</div>
          <div class="settings-hint">System follows your OS setting.</div>
        </div>
        <Segmented :model-value="themeChoice" label="Theme" :options="THEMES" @update:model-value="(t: ThemeChoice) => setTheme(t)" />
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-name">Editor</div>
          <div class="settings-hint">Adds "Open in editor" to issues.</div>
        </div>
        <Segmented :model-value="editorChoice" label="Editor" :options="editors" @update:model-value="(e: EditorChoice) => setEditor(e)" />
      </div>
    </div>
    <template #actions>
      <button type="button" class="primary" @click="emit('close')">Done</button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.settings { display: grid; gap: 4px; margin-top: 4px; }
.settings-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 12px 0; border-top: 1px solid var(--border-subtle); }
.settings-row:first-child { border-top: 0; }
.settings-name { font-weight: 500; }
.settings-hint { font-size: 12px; color: var(--text-3); margin-top: 2px; }
</style>
