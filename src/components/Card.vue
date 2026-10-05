<script setup lang="ts">
import { computed } from 'vue';
import { TerminalSquare } from '@lucide/vue';
import type { Issue } from '../types';
import { useWorkspace } from '../workspace';
import { useIssueActions } from '../actions';
import { useIssueContextMenu } from '../issueContext';
import Avatar from './Avatar.vue';
import LabelPill from './LabelPill.vue';
import StatusIcon from './StatusIcon.vue';

// A board card (#0053): id and assignee, status and title, then labels and
// markers. Right-click opens the issue menu (#0055).
const props = defineProps<{ issue: Issue; highlighted?: boolean }>();
const emit = defineEmits<{
  (e: 'open' | 'toggle-assignee', issue: Issue): void;
}>();

const { relations } = useWorkspace();
const waiting = computed(() => relations.value.isWaiting(props.issue));
const actions = useIssueActions();
const contextMenu = useIssueContextMenu();
const hasMeta = computed(() => waiting.value || props.issue.reviewed || props.issue.deployed || props.issue.labels.length > 0);

function onToggleAssignee(e: MouseEvent) {
  e.stopPropagation();
  emit('toggle-assignee', props.issue);
}
</script>

<template>
  <div
    class="card"
    :class="{ archived: props.issue.archived, hl: props.highlighted }"
    tabindex="0"
    @click="emit('open', props.issue)"
    @keydown.enter.self="emit('open', props.issue)"
    @keydown="(e) => contextMenu.onKeydown(e, props.issue)"
    @contextmenu.prevent="(e) => contextMenu.open(e, props.issue)"
  >
    <div class="card-top">
      <span class="card-id">{{ props.issue.id }}</span>
      <button
        v-if="!props.issue.archived"
        type="button"
        class="card-prompt"
        title="Copy agent prompt"
        aria-label="Copy agent prompt"
        @click.stop="actions.copyIssuePrompt(props.issue)"
      >
        <TerminalSquare :size="13" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="card-assignee"
        :aria-label="`Toggle assignee (currently ${props.issue.assignee})`"
        :title="`${props.issue.assignee === 'agent' ? 'Agent' : 'You'} — click to switch`"
        @click="onToggleAssignee"
      >
        <Avatar :assignee="props.issue.assignee" />
      </button>
    </div>
    <div class="card-title-row">
      <StatusIcon :status="props.issue.status" />
      <span class="card-title">{{ props.issue.title }}</span>
    </div>
    <div v-if="hasMeta" class="card-meta">
      <span v-if="waiting" class="marker marker-waiting" :title="`Waits for #${props.issue.parent} to be done`">waiting on #{{ props.issue.parent }}</span>
      <span v-if="props.issue.reviewed" class="marker marker-reviewed" :title="`Reviewed ${props.issue.reviewed}`">✓ reviewed</span>
      <span v-if="props.issue.deployed" class="marker marker-deployed" :title="`Deployed ${props.issue.deployed}`">↑ deployed</span>
      <LabelPill v-for="l in props.issue.labels" :key="l" :label="l" />
    </div>
  </div>
</template>

<style scoped>
.card {
  display: grid;
  gap: 6px;
  padding: 9px 10px 10px;
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.card:hover { border-color: var(--border-strong); box-shadow: var(--shadow); }
.card.hl, .card:focus-visible { border-color: var(--accent); box-shadow: 0 0 0 3px var(--focus); }
.card.archived { border-style: dashed; box-shadow: none; opacity: 0.75; cursor: default; }
.card-top { display: flex; align-items: center; gap: 4px; height: 18px; }
.card-top .card-id { flex: 1; }
.card-prompt { display: grid; place-items: center; width: 22px; height: 22px; padding: 0; border: 0; border-radius: var(--r-sm); background: transparent; color: var(--text-3); opacity: 0; }
.card:hover .card-prompt, .card-prompt:focus-visible { opacity: 1; }
.card-prompt:hover { background: var(--bg-hover); color: var(--text); }
.card-assignee { display: grid; place-items: center; width: 22px; height: 22px; padding: 0; border: 0; border-radius: 50%; background: transparent; }
.card-assignee:hover { background: transparent; box-shadow: 0 0 0 2px var(--border-strong); }
.card-title-row { display: flex; align-items: flex-start; gap: 7px; }
.card-title-row .status-icon { margin-top: 2px; }
.card-title { font-size: 13px; font-weight: 500; line-height: 1.4; color: var(--text); overflow-wrap: anywhere; }
.card-meta { display: flex; flex-wrap: wrap; gap: 4px; }
</style>
