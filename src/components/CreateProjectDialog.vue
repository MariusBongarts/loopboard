<script setup lang="ts">
import { ref, watch } from 'vue';
import { createProject } from '../api';
import { useWorkspace } from '../workspace';
import BaseDialog from './BaseDialog.vue';

// New project (#0020): PRD + WIP from the templates; the agent writes the PRD.
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'created', slug: string): void }>();
const { id: workspaceId } = useWorkspace();
const title = ref('');
const busy = ref(false);
const error = ref<string | null>(null);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    title.value = '';
    error.value = null;
  },
);

async function submit() {
  if (!title.value.trim() || busy.value) return;
  busy.value = true;
  try {
    emit('created', (await createProject(workspaceId.value, title.value)).slug);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <BaseDialog :open="props.open" label="New project" eyebrow="New project" @close="emit('close')">
    <form @submit.prevent="submit">
      <input v-model="title" class="create-title" type="text" aria-label="Project title" placeholder="Project title" />
      <p class="create-hint">Creates <code>prd.md</code> and <code>wip.md</code> from your templates. Then ask your agent to write the PRD.</p>
      <p v-if="error" class="ws-error" role="alert">{{ error }}</p>
    </form>
    <template #actions>
      <button type="button" @click="emit('close')">Cancel</button>
      <button type="button" class="primary" :disabled="busy || !title.trim()" @click="submit">Create project</button>
    </template>
  </BaseDialog>
</template>
