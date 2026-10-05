<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { removeWorkspace, renameWorkspace } from '../api';
import type { WorkspaceSummary } from '../types';
import BaseDialog from './BaseDialog.vue';

const props = defineProps<{ open: boolean; workspaces: WorkspaceSummary[]; currentId: string | null }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'changed'): void }>();
const router = useRouter();
const editing = ref<string | null>(null);
const draft = ref('');
const confirming = ref<string | null>(null);
const error = ref<string | null>(null);

function startRename(w: WorkspaceSummary) {
  editing.value = w.id;
  draft.value = w.name;
  confirming.value = null;
}

async function saveRename(w: WorkspaceSummary) {
  const name = draft.value.trim();
  editing.value = null;
  if (!name || name === w.name) return;
  try {
    await renameWorkspace(w.id, name);
    emit('changed');
  } catch (e) {
    error.value = (e as Error).message;
  }
}

async function remove(w: WorkspaceSummary) {
  try {
    await removeWorkspace(w.id);
    confirming.value = null;
    emit('changed');
    if (w.id === props.currentId) {
      emit('close');
      router.push('/');
    }
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>

<template>
  <BaseDialog :open="props.open" label="Manage workspaces" eyebrow="Workspaces" wide @close="emit('close')">
    <h3>Manage workspaces</h3>
    <p>Removing a workspace only forgets it here — nothing on disk changes.</p>
    <ul class="ws-manage">
      <li v-for="w in props.workspaces" :key="w.id">
        <div class="ws-manage-main">
          <input
            v-if="editing === w.id"
            v-model="draft"
            class="ws-rename"
            aria-label="Workspace name"
            @keydown.enter.prevent="saveRename(w)"
            @keydown.esc.stop="editing = null"
            @blur="saveRename(w)"
          />
          <span v-else class="ws-manage-name">{{ w.name }}</span>
          <span class="ws-manage-path">{{ w.available ? w.root : `${w.root} — folder missing` }}</span>
        </div>
        <template v-if="confirming === w.id">
          <button type="button" class="danger" @click="remove(w)">Remove</button>
          <button type="button" @click="confirming = null">Keep</button>
        </template>
        <template v-else>
          <button type="button" @click="startRename(w)">Rename</button>
          <button type="button" @click="confirming = w.id">Remove…</button>
        </template>
      </li>
    </ul>
    <p v-if="error" class="ws-error" role="alert">{{ error }}</p>
    <template #actions>
      <button type="button" class="primary" @click="emit('close')">Done</button>
    </template>
  </BaseDialog>
</template>
