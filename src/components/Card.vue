<script setup lang="ts">
import { computed } from 'vue';
import type { Issue } from '../types';
import { relativePath } from '../types';
import { useWorkspace } from '../workspace';
import { useIssueActions } from '../actions';
import { toneClass } from '../colors';
import AgentIcon from './icons/AgentIcon.vue';
import HumanIcon from './icons/HumanIcon.vue';

const props = defineProps<{ issue: Issue; highlighted?: boolean }>();
const emit = defineEmits<{
  (e: 'open' | 'toggle-assignee', issue: Issue): void;
}>();

const { rootName, relations } = useWorkspace();
const waiting = computed(() => relations.value.isWaiting(props.issue));
const actions = useIssueActions();
const path = computed(() => relativePath(props.issue, rootName.value));
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
        v-if="!props.issue.archived"
        type="button"
        class="card-prompt"
        title="Copy agent prompt"
        aria-label="Copy agent prompt"
        @click.stop="actions.copyIssuePrompt(props.issue)"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" /><path d="M2 8.5V2.5A1 1 0 0 1 3 1.5h5" fill="none" stroke="currentColor" /></svg>
      </button>
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
      <span v-if="waiting" class="marker marker-waiting" :title="`Waits for #${props.issue.parent} to be done`">waiting on #{{ props.issue.parent }}</span>
      <span v-if="props.issue.reviewed" class="marker marker-reviewed" :title="`Reviewed ${props.issue.reviewed}`">✓ reviewed</span>
      <span v-if="props.issue.deployed" class="marker marker-deployed" :title="`Deployed ${props.issue.deployed}`">↑ deployed</span>
      <span
        v-for="l in props.issue.labels"
        :key="l"
        class="card-label"
        :class="toneClass(l)"
      >{{ l }}</span>
    </div>
  </div>
</template>
