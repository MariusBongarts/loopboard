<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import CollapsibleStrip from './CollapsibleStrip.vue';
import Column from './Column.vue';
import IssueRefText from './IssueRefText.vue';
import { toneClass } from '../colors';
import { needsYou, relativeDay } from '../inbox';
import { issueFromDocClick, renderProjectDoc } from '../projectDoc';
import {
  ALWAYS_VISIBLE_COLUMNS,
  byPriority,
  searchMatches,
  tokenizeQuery,
  type Assignee,
  type ColumnKey,
  type Issue,
  type Project,
} from '../types';

type Tab = 'board' | 'prd' | 'wip' | 'activity';

// `project: null` renders the standalone bucket: a board with no docs.
const props = defineProps<{
  project: Project | null;
  issues: Issue[];
  today: string;
  highlightId?: string | null;
  pinnedLabel?: string;
}>();

const emit = defineEmits<{
  (e: 'open-issue' | 'toggle-assignee', issue: Issue): void;
  (e: 'open-id', id: string): void;
  (e: 'open-backlog', issues: Issue[]): void;
  (e: 'drop', payload: { issue: Issue; column: ColumnKey }): void;
  (e: 'reorder', payload: { column: ColumnKey; ids: string[]; draggedId: string }): void;
}>();

const tab = ref<Tab>('board');
const who = ref<'all' | Assignee>('all');
const query = ref('');

watch(
  () => props.project?.slug,
  () => {
    tab.value = 'board';
    who.value = 'all';
    query.value = '';
  },
);

// A newly selected issue must be visible: back to the board, no filters,
// and scrolled into view once the columns render.
const rootEl = ref<HTMLElement | null>(null);
watch(
  () => props.highlightId,
  async (id) => {
    if (!id) return;
    tab.value = 'board';
    who.value = 'all';
    query.value = '';
    await nextTick();
    rootEl.value
      ?.querySelector(`[data-issue-id="${id}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  },
  { immediate: true },
);

const scoped = computed(() =>
  props.issues.filter(
    (i) => !i.archived && (props.project ? i.project === props.project.slug : !i.project),
  ),
);
const mineCount = computed(() => scoped.value.filter(needsYou).length);
const backlogIssues = computed(() => scoped.value.filter((i) => i.status === 'backlog'));
const boardCount = computed(
  () => scoped.value.filter((i) => ALWAYS_VISIBLE_COLUMNS.includes(i.status)).length,
);
const tokens = computed(() => tokenizeQuery(query.value));

function issuesIn(col: ColumnKey): Issue[] {
  return scoped.value
    .filter(
      (i) =>
        i.status === col &&
        (who.value === 'all' || i.assignee === who.value) &&
        searchMatches(i, tokens.value),
    )
    .sort(byPriority);
}

const docHtml = computed(() => {
  if (!props.project || (tab.value !== 'prd' && tab.value !== 'wip')) return '';
  const md = tab.value === 'prd' ? props.project.prdBody : props.project.wipBody;
  return renderProjectDoc(md, tab.value, props.issues);
});

function onDocClick(e: MouseEvent) {
  const issue = issueFromDocClick(e, props.issues);
  if (issue) emit('open-issue', issue);
}

const title = computed(() => props.project?.title ?? 'Standalone issues');
</script>

<template>
  <div ref="rootEl" class="pane-view">
    <header class="pane-head">
      <div class="pane-title-row">
        <span v-if="props.project" class="pane-dot" :class="toneClass(props.project.slug)" />
        <h2 class="pane-title">{{ title }}</h2>
        <span class="pane-meta">
          <template v-if="props.project">
            {{ props.project.status === 'unknown' ? 'active' : props.project.status }}
            <template v-if="props.project.lastSession">
              · last session {{ relativeDay(props.project.lastSession, props.today) }}
            </template>
          </template>
          <template v-else>Issues without a project</template>
        </span>
      </div>
      <CollapsibleStrip
        v-if="props.project?.focus"
        storage-key="tracker.pane.focusCollapsed"
        label="Current focus"
        class="pane-focus"
        :class="toneClass(props.project.slug)"
      >
        <p><IssueRefText :text="props.project.focus" @open-id="(id) => emit('open-id', id)" /></p>
      </CollapsibleStrip>
      <CollapsibleStrip
        v-if="$slots.pinned"
        storage-key="tracker.pane.pinnedCollapsed"
        :label="props.pinnedLabel"
        class="pane-pinned"
      >
        <slot name="pinned" />
      </CollapsibleStrip>
      <nav class="pane-tabs" role="tablist">
        <button role="tab" :class="{ on: tab === 'board' }" :aria-selected="tab === 'board'" @click="tab = 'board'">
          Board <span>{{ boardCount }}</span>
        </button>
        <template v-if="props.project">
          <button role="tab" :class="{ on: tab === 'prd' }" :aria-selected="tab === 'prd'" @click="tab = 'prd'">PRD</button>
          <button role="tab" :class="{ on: tab === 'wip' }" :aria-selected="tab === 'wip'" @click="tab = 'wip'">WIP</button>
          <button role="tab" :class="{ on: tab === 'activity' }" :aria-selected="tab === 'activity'" @click="tab = 'activity'">
            Activity <span>{{ props.project.sessions.length }}</span>
          </button>
        </template>
      </nav>
    </header>

    <div v-if="tab === 'board'" class="pane-body">
      <div class="pane-board-tools">
        <div class="seg" role="group" aria-label="Assignee">
          <button :class="{ on: who === 'all' }" @click="who = 'all'">Everyone</button>
          <button :class="{ on: who === 'human' }" @click="who = 'human'">
            Mine<template v-if="mineCount"> · {{ mineCount }}</template>
          </button>
          <button :class="{ on: who === 'agent' }" @click="who = 'agent'">Agent</button>
        </div>
        <input v-model="query" type="search" class="pane-search" placeholder="Filter this board" aria-label="Filter this board" />
        <button
          v-if="backlogIssues.length"
          type="button"
          class="pane-backlog"
          @click="emit('open-backlog', backlogIssues)"
        >Backlog {{ backlogIssues.length }}</button>
      </div>
      <div class="pane-board">
        <Column
          v-for="col in ALWAYS_VISIBLE_COLUMNS"
          :key="col"
          :column-key="col"
          :issues="issuesIn(col)"
          :highlight-id="props.highlightId"
          @open="(iss) => emit('open-issue', iss)"
          @toggle-assignee="(iss) => emit('toggle-assignee', iss)"
          @drop="(p) => emit('drop', p)"
          @reorder="(p) => emit('reorder', p)"
        />
      </div>
    </div>

    <div v-else-if="tab === 'activity' && props.project" class="pane-body pane-activity">
      <p v-if="props.project.sessions.length === 0" class="pane-empty">No dated entries in this project's activity log.</p>
      <div v-for="s in props.project.sessions" :key="s.date" class="pane-log">
        <span class="pane-log-date">{{ s.date }}</span>
        <p><IssueRefText :text="s.note" @open-id="(id) => emit('open-id', id)" /></p>
      </div>
    </div>

    <div v-else class="pane-body">
      <div class="drawer-body project-body pane-doc" @click="onDocClick" v-html="docHtml" />
    </div>
  </div>
</template>
