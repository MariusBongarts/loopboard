<script setup lang="ts">
import { computed } from 'vue';
import type { Issue } from '../types';
import { relativePath } from '../types';
import { toneClass } from '../colors';
import AgentIcon from './icons/AgentIcon.vue';
import HumanIcon from './icons/HumanIcon.vue';

const props = defineProps<{ issue: Issue; highlighted?: boolean }>();
const emit = defineEmits<{
  (e: 'open' | 'toggle-assignee', issue: Issue): void;
}>();

const path = computed(() => relativePath(props.issue));
const projectToneClass = computed(() =>
  props.issue.project ? toneClass(props.issue.project) : '',
);

function onToggleAssignee(e: MouseEvent) {
  e.stopPropagation();
  emit('toggle-assignee', props.issue);
}
</script>

<template>
  <div
    class="card"
    :class="{ archived: props.issue.archived, hl: props.highlighted }"
    @click="emit('open', props.issue)"
  >
    <div class="card-top">
      <span class="card-id">#{{ props.issue.id }}</span>
      <span class="card-cat" :class="props.issue.category">{{ props.issue.category }}</span>
      <button
        type="button"
        class="card-assignee card-assignee-icon"
        :class="`assignee-${props.issue.assignee}`"
        :aria-label="`Toggle assignee (currently ${props.issue.assignee})`"
        :title="`Assignee: ${props.issue.assignee} — click to toggle`"
        @click="onToggleAssignee"
      >
        <AgentIcon v-if="props.issue.assignee === 'agent'" />
        <HumanIcon v-else />
      </button>
    </div>
    <div class="card-title">{{ props.issue.title }}</div>
    <div class="card-path" :title="path">{{ path }}</div>
    <div class="card-meta">
      <span
        v-if="props.issue.project"
        class="card-project"
        :class="projectToneClass"
      >{{ props.issue.project }}</span>
      <span v-else class="card-project standalone">standalone</span>
      <span
        v-for="l in props.issue.labels"
        :key="l"
        class="card-label"
        :class="toneClass(l)"
      >{{ l }}</span>
    </div>
  </div>
</template>
