<script setup lang="ts">
import { Crosshair, TerminalSquare } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import BadgePopover from './BadgePopover.vue';
import IssueBoard from './IssueBoard.vue';
import IssueRefText from './IssueRefText.vue';
import { useIssueActions } from '../actions';
import DocEditor from './DocEditor.vue';
import { toneClass } from '../colors';
import { boardIssueCount, inProject, prdNumber, relativeDay } from '../inbox';
import { issueFromDocClick, renderProjectDoc } from '../projectDoc';
import type { ColumnKey, Issue, Project } from '../types';

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

watch(
  () => props.project?.slug,
  () => {
    tab.value = 'board';
  },
);

watch(
  () => props.requestTab?.nonce,
  () => {
    if (props.requestTab) tab.value = props.requestTab.tab;
  },
  { immediate: true },
);

// A newly selected issue must be visible, so back to the board.
watch(
  () => props.highlightId,
  (id) => {
    if (id) tab.value = 'board';
  },
  { immediate: true },
);

const boardIssues = computed(() => props.issues.filter((i) => inProject(i, props.project?.slug ?? null)));
const boardCount = computed(() => boardIssueCount(props.issues, props.project?.slug ?? null));

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
  <div class="pane-view">
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

    <div v-show="tab === 'board'" class="pane-body">
      <IssueBoard
        :key="props.project?.slug ?? 'standalone'"
        :issues="boardIssues"
        :highlight-id="props.highlightId"
        @open-issue="(i, list) => emit('open-issue', i, list)"
        @toggle-assignee="(i) => emit('toggle-assignee', i)"
        @open-backlog="(list) => emit('open-backlog', list)"
        @drop="(p) => emit('drop', p)"
        @reorder="(p) => emit('reorder', p)"
      />
    </div>

    <div v-if="tab === 'activity' && props.project" class="pane-body pane-activity">
      <p v-if="props.project.sessions.length === 0" class="pane-empty">No dated entries in this project's activity log.</p>
      <div v-for="s in props.project.sessions" :key="s.date" class="pane-log">
        <span class="pane-log-date">{{ s.date }}</span>
        <p><IssueRefText :text="s.note" @open-id="(id) => emit('open-id', id)" /></p>
      </div>
    </div>

    <div v-else-if="tab !== 'board'" class="pane-body">
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
