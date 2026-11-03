<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChevronDown } from '@lucide/vue';
import IssueBoard from './IssueBoard.vue';
import StatusIcon from './StatusIcon.vue';
import {
  SCOPE_ALL,
  SCOPE_BACKLOG,
  SCOPE_NO_PROJECT,
  boardCardCount,
  boardScopeColumns,
  boardScopeIssues,
  boardScopeItems,
  boardScopeLabel,
  parseBoardScope,
} from '../board';
import { toneClass } from '../colors';
import { prdNumber } from '../inbox';
import { anchorOf, openMenu } from '../menu';
import type { ColumnKey, Issue } from '../types';
import { useWorkspace } from '../workspace';

// Every issue on one board (#0138); the top-left menu narrows it to a project,
// to issues without one, or to the backlog.
const emit = defineEmits<{
  (e: 'open-issue', issue: Issue, list?: Issue[]): void;
  (e: 'toggle-assignee', issue: Issue): void;
  (e: 'open-backlog', issues: Issue[]): void;
  (e: 'drop', payload: { issue: Issue; column: ColumnKey }): void;
  (e: 'reorder', payload: { column: ColumnKey; ids: string[]; draggedId: string }): void;
}>();

const route = useRoute();
const router = useRouter();
const { issues, projects } = useWorkspace();

const scope = computed(() => parseBoardScope(route.query.scope, projects.value));
const label = computed(() => boardScopeLabel(scope.value, projects.value));
const isProject = computed(() => ![SCOPE_ALL, SCOPE_NO_PROJECT, SCOPE_BACKLOG].includes(scope.value));
const scoped = computed(() => boardScopeIssues(issues.value, scope.value));
const columns = computed(() => boardScopeColumns(scope.value));
const count = computed(() => boardCardCount(scoped.value, columns.value));

function pick(next: string) {
  void router.push({ query: next === SCOPE_ALL ? {} : { scope: next } });
}

function openScope(e: MouseEvent) {
  openMenu({
    label: 'Board scope',
    at: anchorOf(e),
    filter: 'Project…',
    items: () => boardScopeItems(projects.value, scope.value, pick),
  });
}
</script>

<template>
  <section class="pane-view board-view" aria-label="Board">
    <header class="pane-head board-view-head">
      <div class="pane-title-row">
        <h2 class="pane-title">
          <button type="button" class="board-scope" aria-haspopup="menu" :aria-label="`Board scope: ${label}`" @click="openScope">
            <span v-if="isProject" class="pane-dot" :class="toneClass(scope)" />
            <span v-if="isProject && prdNumber(scope)" class="prd-num">{{ prdNumber(scope) }}</span>
            <StatusIcon v-else-if="scope === SCOPE_BACKLOG" status="backlog" />
            <span class="board-scope-label">{{ label }}</span>
            <ChevronDown class="board-scope-caret" :size="14" aria-hidden="true" />
          </button>
        </h2>
        <span class="board-count">{{ count }}</span>
      </div>
    </header>
    <div class="pane-body">
      <IssueBoard
        :key="scope"
        board-only
        :issues="scoped"
        :columns="columns"
        :show-project="scope === SCOPE_ALL || scope === SCOPE_BACKLOG"
        @open-issue="(i, list) => emit('open-issue', i, list)"
        @toggle-assignee="(i) => emit('toggle-assignee', i)"
        @open-backlog="(list) => emit('open-backlog', list)"
        @drop="(p) => emit('drop', p)"
        @reorder="(p) => emit('reorder', p)"
      />
    </div>
  </section>
</template>

<style scoped>
.board-view-head { padding-bottom: 10px; }
.board-view-head .pane-title { margin-left: -8px; }
.board-scope {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 3px 8px;
  border: 0;
  border-radius: var(--r);
  background: transparent;
  color: var(--text);
  font: inherit;
  letter-spacing: inherit;
}
.board-scope:hover { background: var(--bg-hover); }
.board-scope-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.board-scope-caret { flex: 0 0 auto; color: var(--text-3); }
.board-count { font-size: 13px; color: var(--text-3); font-variant-numeric: tabular-nums; }
</style>
