<script setup lang="ts">
import { ref } from 'vue';
import { ArrowUpRight } from '@lucide/vue';
import { useIssueContextMenu } from '../issueContext';
import type { Issue } from '../types';
import Avatar from './Avatar.vue';
import LabelPill from './LabelPill.vue';

// One backlog idea (#0139): the drawer lists them, the Backlog view orders
// them. Promote it to Todo, or open it. `lead` is what the view draws in front.
const props = defineProps<{ issue: Issue }>();
const emit = defineEmits<{
  (e: 'open' | 'promote', issue: Issue): void;
}>();
const contextMenu = useIssueContextMenu();

// A short "Promoted" note on the row until the refresh removes it.
const promoting = ref(false);

function onPromote() {
  promoting.value = true;
  emit('promote', props.issue);
  setTimeout(() => {
    promoting.value = false;
  }, 1200);
}
</script>

<template>
  <li
    class="backlog-row"
    :class="{ promoting }"
    :data-issue-id="props.issue.id"
    tabindex="0"
    @click="emit('open', props.issue)"
    @keydown.enter.self="emit('open', props.issue)"
    @keydown="(e) => contextMenu.onKeydown(e, props.issue)"
    @contextmenu.prevent="(e) => contextMenu.open(e, props.issue)"
  >
    <slot name="lead" />
    <span class="card-id">{{ props.issue.id }}</span>
    <span class="backlog-row-main">
      <span class="backlog-row-title">{{ props.issue.title }}</span>
      <span v-if="props.issue.labels.length" class="backlog-row-meta">
        <LabelPill v-for="l in props.issue.labels" :key="l" :label="l" />
      </span>
    </span>
    <Avatar :assignee="props.issue.assignee" />
    <button
      v-if="!promoting"
      type="button"
      class="backlog-promote"
      title="Promote to Todo"
      aria-label="Promote to Todo"
      @click.stop="onPromote"
    ><ArrowUpRight :size="14" aria-hidden="true" />Todo</button>
    <span v-else class="backlog-promoted">Promoted</span>
  </li>
</template>

<style scoped>
.backlog-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px 10px 18px; border-bottom: 1px solid var(--border-subtle); background: var(--bg); cursor: pointer; }
.backlog-row:hover { background: var(--bg-hover); }
.backlog-row.promoting { opacity: 0.6; }
.backlog-row-main { flex: 1; display: grid; gap: 4px; min-width: 0; }
.backlog-row-title { overflow: hidden; font-size: 13px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.backlog-row-meta { display: flex; flex-wrap: wrap; gap: 4px; }
.backlog-promote { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; font-size: 12px; }
.backlog-promoted { font-size: 12px; color: var(--green-text); }
</style>
