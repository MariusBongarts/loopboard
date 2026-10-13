<script setup lang="ts">
import { computed } from 'vue';
import { printable } from '../../shared/printable';
import { skippedPrompt } from '../prompts';
import { skippedLabel, type SkippedFile } from '../types';
import { useWorkspace } from '../workspace';
import BaseDialog from './BaseDialog.vue';
import CopyPrompt from './CopyPrompt.vue';

// Files the reader couldn't show, each with its reason, and a prompt that
// hands them to the agent (#0071). The board reports; it never repairs.
const props = defineProps<{ open: boolean; files: SkippedFile[] }>();
const emit = defineEmits<{ (e: 'close'): void }>();
const { rootName } = useWorkspace();
const prompt = computed(() => skippedPrompt(props.files, rootName.value));
</script>

<template>
  <BaseDialog :open="props.open" label="Skipped files" eyebrow="Workspace" wide @close="emit('close')">
    <h3>{{ skippedLabel(props.files.length) }}</h3>
    <template v-if="props.files.length">
      <p>These are in the workspace but not on the board. Nothing was changed on disk.</p>
      <ul class="skipped-list">
        <li v-for="f in props.files" :key="f.file">
          <span class="skipped-file">{{ printable(`${rootName}/${f.file}`) }}</span>
          <span class="skipped-reason">{{ f.reason }}</span>
        </li>
      </ul>
      <p>Paste this into your agent to fix them:</p>
      <CopyPrompt :text="prompt" label="Copy agent prompt" />
    </template>
    <p v-else>Every file is on the board now.</p>
    <template #actions>
      <button type="button" @click="emit('close')">Done</button>
    </template>
  </BaseDialog>
</template>

<style scoped>
/* The rest of the dialog takes about 330px: on a short window the two
   scrolling parts give way, so "Done" stays on screen. */
.skipped-list { list-style: none; max-height: min(34vh, calc((100vh - 330px) * 0.6)); margin: 0 0 14px; padding: 0; overflow-y: auto; border-bottom: 1px solid var(--border-subtle); }
.skipped-list li { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2px; padding: 8px 0; border-top: 1px solid var(--border-subtle); }
.skipped-file { font: 11.5px var(--mono); color: var(--text); overflow-wrap: anywhere; }
.skipped-reason { font-size: 12px; color: var(--text-3); overflow-wrap: anywhere; }
.copy-prompt { margin-bottom: 14px; }
.copy-prompt :deep(pre) { max-height: min(22vh, calc((100vh - 330px) * 0.4)); overflow-y: auto; }
</style>
