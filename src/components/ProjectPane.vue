<script setup lang="ts">
import { Crosshair, TerminalSquare } from '@lucide/vue';
import { computed, nextTick, ref, watch } from 'vue';
import Avatar from './Avatar.vue';
import BadgePopover from './BadgePopover.vue';
import Column from './Column.vue';
import IssueRefText from './IssueRefText.vue';
import Segmented from './Segmented.vue';
import { useIssueActions } from '../actions';
import { useWorkspace } from '../workspace';
import DocEditor from './DocEditor.vue';
import IssueList from './IssueList.vue';
import { groupIssues } from '../list';
import { useOverflowEdges } from '../overflow';
import { readStored, writeStored } from '../storage';
import { passesBoardFilters } from '../inbox';
import { toneClass } from '../colors';
import { boardColumnIssues, boardIssueCount, needsYou, prdNumber, relativeDay } from '../inbox';
import { issueFromDocClick, renderProjectDoc } from '../projectDoc';
import {
  ALWAYS_VISIBLE_COLUMNS,
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
  requestTab?: { tab: 'board' | 'prd'; nonce: number } | null;
}>();
const actions = useIssueActions();

const emit = defineEmits<{
  (e: 'open-issue', issue: Issue, list?: Issue[]): void;
  (e: 'toggle-assignee', issue: Issue): void;
  (e: 'open-id', id: string): void;
  (e: 'open-backlog', issues: Issue[]): void;
  (e: 'drop', payload: { issue: Issue; column: ColumnKey }): void;
  (e: 'reorder', payload: { column: ColumnKey; ids: string[]; draggedId: string }): void;
}>();

const tab = ref<Tab>('board');
// PRD and WIP are editable in place (#0027).
const editingDoc = ref(false);
watch(
  () => [props.project?.slug, tab.value],
  () => (editingDoc.value = false),
);
const docPath = computed(() => (props.project ? `projects/${props.project.slug}/${tab.value}.md` : ''));
const docVersion = computed(() => (props.project ? (tab.value === 'prd' ? props.project.prdBody : props.project.wipBody) : ''));
const who = ref<'all' | Assignee>('all');
// Done but not reviewed yet (#0040): a review queue, not a column.
const unreviewedOnly = ref(false);
// Hide issues whose parent isn't done yet (#0028).
const hideWaiting = ref(false);
// Board or dense list (#0031), remembered per browser.
const layout = ref<'board' | 'list'>(readStored('loopboard.paneLayout') === 'list' ? 'list' : 'board');
watch(layout, (l) => writeStored('loopboard.paneLayout', l));
const { relations } = useWorkspace();
const query = ref('');

watch(
  () => props.project?.slug,
  () => {
    tab.value = 'board';
    who.value = 'all';
    query.value = '';
    unreviewedOnly.value = false;
    hideWaiting.value = false;
  },
);

watch(
  () => props.requestTab?.nonce,
  () => {
    if (props.requestTab) tab.value = props.requestTab.tab;
  },
  { immediate: true },
);

// A newly selected issue must be visible: back to the board, no filters,
// and scrolled into view once the columns render.
const rootEl = ref<HTMLElement | null>(null);
const boardEl = ref<HTMLElement | null>(null);
const boardEdges = useOverflowEdges(boardEl);
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
const boardCount = computed(() =>
  boardIssueCount(props.issues, props.project?.slug ?? null),
);
const tokens = computed(() => tokenizeQuery(query.value));

const waitingCount = computed(() => scoped.value.filter((i) => relations.value.isWaiting(i)).length);
const unreviewedCount = computed(() => scoped.value.filter((i) => i.status === 'done' && !i.reviewed).length);
const listGroups = computed(() =>
  groupIssues(
    scoped.value.filter(
      (i) =>
        passesBoardFilters(i, who.value, tokens.value) &&
        (!hideWaiting.value || !relations.value.isWaiting(i)) &&
        (!unreviewedOnly.value || (i.status === 'done' && !i.reviewed)),
    ),
    'status',
  ),
);
// Reading order of the board for the panel's ‹ › (#0050): column by column.
const boardOrder = computed(() => ALWAYS_VISIBLE_COLUMNS.flatMap((col) => issuesIn(col)));

function issuesIn(col: ColumnKey): Issue[] {
  const list = boardColumnIssues(props.issues, props.project?.slug ?? null, col, who.value, tokens.value);
  const shown = hideWaiting.value ? list.filter((i) => !relations.value.isWaiting(i)) : list;
  return unreviewedOnly.value ? shown.filter((i) => i.status === 'done' && !i.reviewed && !i.archived) : shown;
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
        <span v-if="props.project && prdNumber(props.project.slug)" class="prd-num">{{ prdNumber(props.project.slug) }}</span>
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
        <BadgePopover
          v-if="props.project?.focus"
          label="Current focus"
          :tone="toneClass(props.project.slug)"
        >
          <template #badge><Crosshair :size="12" aria-hidden="true" />Focus</template>
          <p class="pane-focus-text"><IssueRefText :text="props.project.focus" @open-id="(id) => emit('open-id', id)" /></p>
        </BadgePopover>
        <BadgePopover v-if="$slots.pinned" :label="props.pinnedLabel ?? ''">
          <template #badge><slot name="pinned-badge">{{ props.pinnedLabel }}</slot></template>
          <slot name="pinned" />
        </BadgePopover>
        <button
          v-if="props.project"
          type="button"
          class="pane-prompt"
          title="Copy a prompt that hands this project to your agent"
          @click="actions.copyProjectPrompt(props.project)"
        ><TerminalSquare :size="14" aria-hidden="true" />Copy agent prompt</button>
      </div>
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
        <Segmented
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
      <IssueList v-if="layout === 'list'" :groups="listGroups" :active-id="props.highlightId" @open="(i) => emit('open-issue', i, listGroups.flatMap((g) => g.issues))" />
      <div v-else ref="boardEl" class="pane-board" :class="{ 'more-left': boardEdges.left.value, 'more-right': boardEdges.right.value }">
        <Column
          v-for="col in ALWAYS_VISIBLE_COLUMNS"
          :key="col"
          :column-key="col"
          :issues="issuesIn(col)"
          :highlight-id="props.highlightId"
          @open="(iss) => emit('open-issue', iss, boardOrder)"
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
      <DocEditor v-if="editingDoc" :path="docPath" :version="docVersion" @close="editingDoc = false" />
      <template v-else>
        <div class="pane-doc-tools">
          <button type="button" @click="editingDoc = true">Edit {{ tab === 'prd' ? 'PRD' : 'WIP' }}</button>
        </div>
        <div class="prose pane-doc" @click="onDocClick" v-html="docHtml" />
      </template>
    </div>
  </div>
</template>
