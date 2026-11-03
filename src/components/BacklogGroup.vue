<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { GripVertical } from '@lucide/vue';
import draggable from 'vuedraggable';
import BacklogRow from './BacklogRow.vue';
import ProjectBadge from './ProjectBadge.vue';
import type { Group } from '../list';
import type { ColumnKey, Issue } from '../types';

// One project's ideas in priority order (#0139). Drag a row (or Alt+↑/↓ on a
// focused one) to reorder; rows stay in their group, moving an idea to another
// project is the Project picker's job.
const props = defineProps<{ group: Group }>();
const emit = defineEmits<{
  (e: 'open' | 'promote', issue: Issue): void;
  (e: 'reorder', payload: { column: ColumnKey; ids: string[]; draggedId: string }): void;
}>();

// Local copy mirrors the prop, as in Column.vue: vuedraggable mutates it.
const rows = ref<Issue[]>([...props.group.issues]);
watch(
  () => props.group.issues,
  (next) => {
    rows.value = [...next];
  },
);

function reorder(draggedId: string) {
  emit('reorder', { column: 'backlog', ids: rows.value.map((i) => i.id), draggedId });
}

function onChange(evt: { moved?: { element: Issue } }) {
  if (evt.moved) reorder(evt.moved.element.id);
}

const list = ref<InstanceType<typeof draggable> | null>(null);
async function nudge(issue: Issue, delta: number) {
  const from = rows.value.findIndex((i) => i.id === issue.id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= rows.value.length) return;
  const next = [...rows.value];
  next.splice(to, 0, ...next.splice(from, 1));
  rows.value = next;
  reorder(issue.id);
  await nextTick();
  list.value?.$el.querySelector(`[data-issue-id="${issue.id}"]`)?.focus();
}
</script>

<template>
  <section class="backlog-group" :aria-label="props.group.label">
    <h3 class="backlog-group-head">
      <ProjectBadge v-if="props.group.key" :slug="props.group.key" />
      <span v-else>{{ props.group.label }}</span>
      <span class="backlog-group-count">{{ rows.length }}</span>
    </h3>
    <draggable
      ref="list"
      v-model="rows"
      :group="`backlog:${props.group.key}`"
      item-key="id"
      tag="ul"
      class="backlog-group-list"
      ghost-class="dragging"
      :animation="150"
      @change="onChange"
    >
      <template #item="{ element, index }">
        <BacklogRow
          :issue="element"
          @open="emit('open', element)"
          @promote="emit('promote', element)"
          @keydown.alt.up.prevent="nudge(element, -1)"
          @keydown.alt.down.prevent="nudge(element, 1)"
        >
          <template #lead>
            <GripVertical class="backlog-grip" :size="14" aria-hidden="true" />
            <span class="backlog-rank" :title="`Priority ${index + 1} in this group`">{{ index + 1 }}</span>
          </template>
        </BacklogRow>
      </template>
    </draggable>
  </section>
</template>

<style scoped>
.backlog-group + .backlog-group { margin-top: 18px; }
.backlog-group-head { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; padding: 0 20px; font-size: 12.5px; font-weight: 500; color: var(--text-2); }
.backlog-group-count { font-weight: 400; color: var(--text-4); font-variant-numeric: tabular-nums; }
.backlog-group-list { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--border-subtle); }
.backlog-group-list :deep(.backlog-row) { padding-left: 8px; }
.backlog-group-list :deep(.dragging) { opacity: 0.5; }
.backlog-grip { flex: 0 0 auto; color: var(--text-4); opacity: 0; cursor: grab; }
.backlog-group-list :deep(.backlog-row:hover) .backlog-grip, .backlog-group-list :deep(.backlog-row:focus-visible) .backlog-grip { opacity: 1; }
.backlog-rank { flex: 0 0 18px; font: 11px var(--mono); color: var(--text-4); text-align: right; font-variant-numeric: tabular-nums; }
</style>
