<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { createIssue } from '../api';
import type { Assignee, Project } from '../types';
import { useWorkspace } from '../workspace';
import BaseDialog from './BaseDialog.vue';
import Segmented from './Segmented.vue';

// Quick capture (#0019): the next free number, the category's template body.
const props = defineProps<{ open: boolean; projects: Project[]; defaultProject: string | null; backlog?: boolean }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'created', id: string): void }>();
const { id: workspaceId } = useWorkspace();

type Category = 'task' | 'user-story' | 'bug';
type Where = 'todo' | 'backlog';
const title = ref('');
const category = ref<Category>('task');
const status = ref<Where>('todo');
const assignee = ref<Assignee>('agent');
const project = ref('');
const busy = ref(false);
const error = ref<string | null>(null);

const openProjects = computed(() => props.projects.filter((p) => p.status !== 'shipped'));

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    title.value = '';
    category.value = 'task';
    status.value = props.backlog ? 'backlog' : 'todo';
    assignee.value = 'agent';
    project.value = props.defaultProject ?? '';
    error.value = null;
  },
);

async function submit() {
  if (!title.value.trim() || busy.value) return;
  busy.value = true;
  try {
    const { id } = await createIssue(workspaceId.value, {
      title: title.value,
      category: category.value,
      status: status.value,
      assignee: assignee.value,
      project: project.value || undefined,
    });
    emit('created', id);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <BaseDialog :open="props.open" label="New issue" eyebrow="New issue" wide @close="emit('close')">
    <form class="create-form" @submit.prevent="submit">
      <input
        v-model="title"
        class="create-title"
        type="text"
        aria-label="Title"
        placeholder="What needs to happen?"
        autocomplete="off"
      />
      <div class="create-row">
        <Segmented
          v-model="category"
          label="Category"
          :options="[
            { value: 'task', label: 'Task' },
            { value: 'user-story', label: 'Story' },
            { value: 'bug', label: 'Bug' },
          ]"
        />
        <Segmented
          v-model="status"
          label="Status"
          :options="[
            { value: 'todo', label: 'Todo' },
            { value: 'backlog', label: 'Backlog' },
          ]"
        />
        <Segmented
          v-model="assignee"
          label="Assignee"
          :options="[
            { value: 'agent', label: 'Agent' },
            { value: 'human', label: 'You' },
          ]"
        />
      </div>
      <label class="create-project">
        <span>Project</span>
        <select v-model="project" aria-label="Project">
          <option value="">No project (standalone)</option>
          <option v-for="p in openProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
        </select>
      </label>
      <p class="create-hint">The body starts from the {{ category }} template — fill it in later, or let your agent do it.</p>
      <p v-if="error" class="ws-error" role="alert">{{ error }}</p>
    </form>
    <template #actions>
      <button type="button" @click="emit('close')">Cancel</button>
      <button type="button" class="primary" :disabled="busy || !title.trim()" @click="submit">Create issue</button>
    </template>
  </BaseDialog>
</template>
