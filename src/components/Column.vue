<script setup lang="ts">
import { ref, watch } from 'vue';
import draggable from 'vuedraggable';
import Card from './Card.vue';
import type { Issue, ColumnKey } from '../types';
import { COLUMN_LABEL } from '../types';

const props = defineProps<{
  columnKey: ColumnKey;
  issues: Issue[];
  highlightId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'open' | 'toggle-assignee', issue: Issue): void;
  (e: 'drop', payload: { issue: Issue; column: ColumnKey }): void;
  (e: 'reorder', payload: { column: ColumnKey; ids: string[]; draggedId: string }): void;
}>();

// Local copy mirrors the prop. vuedraggable mutates this directly during
// drag; the parent re-syncs by re-emitting the prop after refetch.
const localIssues = ref<Issue[]>([...props.issues]);
watch(
  () => props.issues,
  (next) => {
    localIssues.value = [...next];
  },
);

interface ChangeEvent {
  added?: { newIndex: number; element: Issue };
  removed?: { oldIndex: number; element: Issue };
  moved?: { oldIndex: number; newIndex: number; element: Issue };
}

function onChange(evt: ChangeEvent) {
  if (evt.added) {
    // Cross-column drop into this column: status change first, then
    // priority renumber for this column. Source column is intentionally
    // not renumbered (gap closes naturally on its next drop).
    emit('drop', { issue: evt.added.element, column: props.columnKey });
    emit('reorder', {
      column: props.columnKey,
      ids: localIssues.value.map((i) => i.id),
      draggedId: evt.added.element.id,
    });
    return;
  }
  if (evt.moved) {
    emit('reorder', {
      column: props.columnKey,
      ids: localIssues.value.map((i) => i.id),
      draggedId: evt.moved.element.id,
    });
  }
  // evt.removed: do nothing — this column lost an item to another, and
  // we leave a priority gap rather than rewrite all remaining issues.
}
</script>

<template>
  <section class="column" :class="[`col-${columnKey}`, { 'column-empty': issues.length === 0 }]" :aria-label="COLUMN_LABEL[columnKey]">
    <header class="column-head">
      <span>{{ COLUMN_LABEL[columnKey] }}</span>
      <span class="count">{{ issues.length }}</span>
    </header>
    <draggable
      v-model="localIssues"
      group="issues"
      item-key="id"
      class="column-list"
      ghost-class="dragging"
      :animation="150"
      filter=".no-drag"
      :prevent-on-filter="false"
      @change="onChange"
    >
      <template #item="{ element }">
        <div
          :data-issue-id="element.id"
          :data-archived="element.archived ? 'true' : 'false'"
          :class="{ 'no-drag': element.archived }"
        >
          <Card
            :issue="element"
            :highlighted="!!highlightId && element.id === highlightId"
            @open="emit('open', element)"
            @toggle-assignee="emit('toggle-assignee', element)"
          />
        </div>
      </template>
      <template #footer>
        <div v-if="issues.length === 0" class="empty">No issues</div>
      </template>
    </draggable>
  </section>
</template>
