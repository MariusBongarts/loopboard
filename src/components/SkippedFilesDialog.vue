<script setup lang="ts">
import { computed } from 'vue';
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
          <span class="skipped-file">{{ rootName }}/{{ f.file }}</span>
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
.skipped-list { list-style: none; max-height: 34vh; margin: 0 0 14px; padding: 0; overflow-y: auto; border-bottom: 1px solid var(--border-subtle); }
.skipped-list li { display: grid; gap: 2px; padding: 8px 0; border-top: 1px solid var(--border-subtle); }
.skipped-file { font: 11.5px var(--mono); color: var(--text); overflow-wrap: anywhere; }
.skipped-reason { font-size: 12px; color: var(--text-3); }
.copy-prompt { margin-bottom: 14px; }
.copy-prompt :deep(pre) { max-height: 22vh; overflow-y: auto; }
</style>
