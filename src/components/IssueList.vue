<script setup lang="ts">
import { ref } from 'vue';
import { ChevronRight } from '@lucide/vue';
import { useIssueContextMenu } from '../issueContext';
import type { Group } from '../list';
import { ALL_STATUSES, type Issue, type Status } from '../types';
import IssueRow from './IssueRow.vue';
import LabelPill from './LabelPill.vue';
import ProjectBadge from './ProjectBadge.vue';
import StatusIcon from './StatusIcon.vue';

// Dense, grouped rows (#0031, #0054) — Linear's default layout.
const props = defineProps<{ groups: Group[]; activeId?: string | null; showProject?: boolean; groupBy?: 'status' | 'project' | 'label' | 'none' }>();
const emit = defineEmits<{ (e: 'open', issue: Issue): void }>();
const collapsed = ref(new Set<string>());
const contextMenu = useIssueContextMenu();

function toggle(key: string) {
  const next = new Set(collapsed.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  collapsed.value = next;
}

const asStatus = (key: string): Status | null => ALL_STATUSES.find((s) => s === key) ?? null;
</script>

<template>
  <div class="issue-list">
    <p v-if="!props.groups.some((g) => g.issues.length)" class="list-empty">No issues match.</p>
    <section v-for="g in props.groups" :key="g.key" class="issue-group">
      <button type="button" class="issue-group-head" :aria-expanded="!collapsed.has(g.key)" @click="toggle(g.key)">
        <ChevronRight class="issue-group-caret" :class="{ open: !collapsed.has(g.key) }" :size="13" aria-hidden="true" />
        <StatusIcon v-if="(props.groupBy ?? 'status') === 'status' && asStatus(g.key)" :status="asStatus(g.key)!" />
        <ProjectBadge v-else-if="props.groupBy === 'project' && g.key" :slug="g.key" />
        <LabelPill v-else-if="props.groupBy === 'label' && g.key" :label="g.key" />
        <span v-if="!(props.groupBy === 'project' && g.key) && !(props.groupBy === 'label' && g.key)">{{ g.label }}</span>
        <span class="issue-group-count">{{ g.issues.length }}</span>
      </button>
      <template v-if="!collapsed.has(g.key)">
        <IssueRow
          v-for="i in g.issues"
          :key="`${g.key}:${i.id}`"
          :issue="i"
          :active="i.id === props.activeId"
          :show-project="props.showProject"
          @click="emit('open', i)"
          @contextmenu.prevent="(e: MouseEvent) => contextMenu.open(e, i)"
          @keydown="(e: KeyboardEvent) => contextMenu.onKeydown(e, i)"
        />
      </template>
    </section>
  </div>
</template>

<style scoped>
.issue-list { padding: 0 0 24px; }
.issue-group-head {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 36px;
  padding: 0 16px 0 12px;
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  background: var(--bg-subtle);
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
}
.issue-group-head:hover { background: var(--bg-hover); }
.issue-group-caret { color: var(--text-4); transition: transform var(--dur) var(--ease); }
.issue-group-caret.open { transform: rotate(90deg); }
.issue-group-count { color: var(--text-3); font-weight: 400; }
</style>
