<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import Avatar from './Avatar.vue';
import Column from './Column.vue';
import IssueList from './IssueList.vue';
import Segmented from './Segmented.vue';
import { boardColumnIssues, needsYou, passesBoardFilters } from '../inbox';
import { groupIssues } from '../list';
import { useOverflowEdges } from '../overflow';
import { readStored, writeStored } from '../storage';
import { ALWAYS_VISIBLE_COLUMNS, byPriority, tokenizeQuery, type Assignee, type ColumnKey, type Issue } from '../types';
import { useWorkspace } from '../workspace';

// A board and its filters (#0138), shared by the project pane and the Board
// view; each decides which `issues` it holds. Remount it (`:key`) to reset the
// filters when that changes.
const props = defineProps<{
  issues: Issue[];
  columns?: ColumnKey[];
  highlightId?: string | null;
  // Cards name their project when the board spans several.
  showProject?: boolean;
  // No Board / List choice: the view is a board, All issues is the list.
  boardOnly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'open-issue', issue: Issue, list?: Issue[]): void;
  (e: 'toggle-assignee', issue: Issue): void;
  (e: 'open-backlog', issues: Issue[]): void;
  (e: 'drop', payload: { issue: Issue; column: ColumnKey }): void;
  (e: 'reorder', payload: { column: ColumnKey; ids: string[]; draggedId: string }): void;
}>();

const columns = computed(() => props.columns ?? ALWAYS_VISIBLE_COLUMNS);
const who = ref<'all' | Assignee>('all');
// Done but not reviewed yet (#0040): a review queue, not a column.
const unreviewedOnly = ref(false);
// Hide issues whose parent isn't done yet (#0028).
const hideWaiting = ref(false);
// Board or dense list (#0031), remembered per browser.
const layout = ref<'board' | 'list'>(readStored('loopboard.paneLayout') === 'list' ? 'list' : 'board');
watch(layout, (l) => writeStored('loopboard.paneLayout', l));
const showList = computed(() => !props.boardOnly && layout.value === 'list');
const { relations } = useWorkspace();
const query = ref('');

// A newly selected issue must be visible: no filters, and scrolled into view
// once the columns render.
const rootEl = ref<HTMLElement | null>(null);
const boardEl = ref<HTMLElement | null>(null);
const boardEdges = useOverflowEdges(boardEl);
watch(
  () => props.highlightId,
  async (id) => {
    if (!id) return;
    who.value = 'all';
    query.value = '';
    await nextTick();
    rootEl.value
      ?.querySelector(`[data-issue-id="${id}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  },
  { immediate: true },
);

const live = computed(() => props.issues.filter((i) => !i.archived));
const mineCount = computed(() => live.value.filter(needsYou).length);
const backlogIssues = computed(() =>
  columns.value.includes('backlog') ? [] : live.value.filter((i) => i.status === 'backlog').sort(byPriority),
);
const tokens = computed(() => tokenizeQuery(query.value));

const waitingCount = computed(() => live.value.filter((i) => relations.value.isWaiting(i)).length);
const unreviewedCount = computed(() => live.value.filter((i) => i.status === 'done' && !i.reviewed).length);
const listGroups = computed(() =>
  groupIssues(
    live.value.filter(
      (i) =>
        passesBoardFilters(i, who.value, tokens.value) &&
        (!hideWaiting.value || !relations.value.isWaiting(i)) &&
        (!unreviewedOnly.value || (i.status === 'done' && !i.reviewed)),
    ),
    'status',
  ),
);
// Reading order of the board for the panel's ‹ › (#0050): column by column.
const boardOrder = computed(() => columns.value.flatMap((col) => issuesIn(col)));

function issuesIn(col: ColumnKey): Issue[] {
  const list = boardColumnIssues(props.issues, col, who.value, tokens.value);
  const shown = hideWaiting.value ? list.filter((i) => !relations.value.isWaiting(i)) : list;
  return unreviewedOnly.value ? shown.filter((i) => i.status === 'done' && !i.reviewed && !i.archived) : shown;
}
</script>

<template>
  <div ref="rootEl" class="issue-board">
    <div class="pane-board-tools">
      <Segmented
        v-if="!props.boardOnly"
        v-model="layout"
        label="Layout"
        :options="[
          { value: 'board', label: 'Board' },
          { value: 'list', label: 'List' },
        ]"
      />
      <Segmented
        v-model="who"
        label="Assignee"
        :options="[
          { value: 'all', label: 'Everyone' },
          { value: 'human', label: mineCount ? `You · ${mineCount}` : 'You' },
          { value: 'agent', label: 'Agent' },
        ]"
      >
        <template #icon="{ value }"><Avatar v-if="value !== 'all'" :assignee="value" :size="16" /></template>
      </Segmented>
      <input v-model="query" type="search" class="pane-search" placeholder="Filter this board" aria-label="Filter this board" />
      <button
        v-if="waitingCount || hideWaiting"
        type="button"
        class="pane-toggle"
        :class="{ on: hideWaiting }"
        :aria-pressed="hideWaiting"
        title="Hide issues whose parent issue isn't done yet"
        @click="hideWaiting = !hideWaiting"
      >Hide waiting {{ waitingCount }}</button>
      <button
        v-if="unreviewedCount || unreviewedOnly"
        type="button"
        class="pane-toggle"
        :class="{ on: unreviewedOnly }"
        :aria-pressed="unreviewedOnly"
        title="Done issues nobody has marked reviewed yet — the review queue"
        @click="unreviewedOnly = !unreviewedOnly"
      >Unreviewed {{ unreviewedCount }}</button>
      <button
        v-if="backlogIssues.length"
        type="button"
        class="pane-backlog"
        @click="emit('open-backlog', backlogIssues)"
      >Backlog {{ backlogIssues.length }}</button>
    </div>
    <IssueList v-if="showList" :groups="listGroups" :active-id="props.highlightId" @open="(i) => emit('open-issue', i, listGroups.flatMap((g) => g.issues))" />
    <div v-else ref="boardEl" class="pane-board" :class="{ 'more-left': boardEdges.left.value, 'more-right': boardEdges.right.value }">
      <Column
        v-for="col in columns"
        :key="col"
        :column-key="col"
        :issues="issuesIn(col)"
        :highlight-id="props.highlightId"
        :show-project="props.showProject"
        @open="(iss) => emit('open-issue', iss, boardOrder)"
        @toggle-assignee="(iss) => emit('toggle-assignee', iss)"
        @drop="(p) => emit('drop', p)"
        @reorder="(p) => emit('reorder', p)"
      />
    </div>
  </div>
</template>
