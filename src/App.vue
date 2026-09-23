<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { fetchData, patchIssueAssignee, patchIssueStatus, reorderColumn } from './api';
import BacklogDrawer from './components/BacklogDrawer.vue';
import Drawer from './components/Drawer.vue';
import InboxView from './components/InboxView.vue';
import WontfixModal from './components/WontfixModal.vue';
import {
  byPriority,
  columnForStatus,
  type Assignee,
  type ColumnKey,
  type Issue,
  type Project,
  type Spec,
  type Status,
} from './types';

const issues = ref<Issue[]>([]);
const projects = ref<Project[]>([]);
const specs = ref<Spec[]>([]);
const drawerIssue = ref<Issue | null>(null);
const backlogIssues = ref<Issue[] | null>(null);
const errorMsg = ref<string | null>(null);
const wontfixModalOpen = ref(false);
const pendingWontfix = ref<{ issue: Issue; targetIds?: string[] } | null>(null);

async function load() {
  try {
    const data = await fetchData();
    issues.value = data.issues;
    projects.value = data.projects;
    specs.value = data.specs ?? [];
  } catch (e) {
    errorMsg.value = (e as Error).message;
  }
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || wontfixModalOpen.value) return;
  if (backlogIssues.value) backlogIssues.value = null;
  else if (drawerIssue.value) drawerIssue.value = null;
}

onMounted(() => {
  load();
  window.addEventListener('keydown', onGlobalKeydown);
});
onUnmounted(() => window.removeEventListener('keydown', onGlobalKeydown));

function findLive(issue: Issue): Issue | undefined {
  return issues.value.find((i) => i.id === issue.id && i.archived === issue.archived);
}

function openBacklog(list: Issue[]) {
  drawerIssue.value = null;
  backlogIssues.value = list;
}

function onBacklogOpenIssue(iss: Issue) {
  backlogIssues.value = null;
  drawerIssue.value = iss;
}

async function applyStatus(issue: Issue, status: Status, reason?: string): Promise<boolean> {
  // Optimistic-first so a same-tick reorder sees the new bucket.
  const target = findLive(issue);
  const prevStatus = target?.status;
  if (target) target.status = status;
  try {
    await patchIssueStatus(issue.id, issue.archived, status, reason);
    return true;
  } catch (e) {
    if (target && prevStatus !== undefined) target.status = prevStatus;
    errorMsg.value = (e as Error).message;
    await load();
    return false;
  }
}

async function onBacklogPromote(iss: Issue) {
  await applyStatus(iss, 'todo');
  if (backlogIssues.value) backlogIssues.value = backlogIssues.value.filter((i) => i.id !== iss.id);
}

// The reorder PATCH must wait for an in-flight cross-column status PATCH,
// otherwise the server validates against the pre-flip bucket and 400s.
const pendingStatusFlipByDraggedId = new Map<string, Promise<boolean>>();

async function applyAssignee(issue: Issue, assignee: Assignee) {
  try {
    await patchIssueAssignee(issue.id, issue.archived, assignee);
    const target = findLive(issue);
    if (target) target.assignee = assignee;
  } catch (e) {
    errorMsg.value = (e as Error).message;
    await load();
  }
}

function onDrop(payload: { issue: Issue; column: ColumnKey }) {
  const real = findLive(payload.issue);
  if (!real || columnForStatus(real.status) === payload.column) return;
  if (payload.column === 'wontfix') {
    pendingWontfix.value = { issue: real };
    wontfixModalOpen.value = true;
    return;
  }
  const flip = applyStatus(real, payload.column as Status);
  pendingStatusFlipByDraggedId.set(real.id, flip);
  flip.finally(() => {
    if (pendingStatusFlipByDraggedId.get(real.id) === flip) {
      pendingStatusFlipByDraggedId.delete(real.id);
    }
  });
}

async function applyReorder(archived: boolean, status: Status, ids: string[]): Promise<void> {
  try {
    await reorderColumn(archived, status, ids);
  } catch (e) {
    errorMsg.value = (e as Error).message;
    await load();
  }
}

// Board payloads are the filtered view's order; the server validates the
// full bucket, so splice the subset back into the full on-disk order.
function spliceSubset(archived: boolean, column: ColumnKey, subsetIds: string[]): string[] | null {
  const fullOrder = issues.value
    .filter(
      (iss) =>
        iss.archived === archived &&
        iss.status !== 'backlog' &&
        columnForStatus(iss.status) === column,
    )
    .sort(byPriority)
    .map((i) => i.id);
  const subsetSet = new Set(subsetIds);
  let cursor = 0;
  const full = fullOrder.map((id) => (subsetSet.has(id) ? subsetIds[cursor++] : id));
  if (cursor !== subsetIds.length) return null;
  if (full.every((id, idx) => id === fullOrder[idx])) return [];
  return full;
}

function applyLocalPriorities(archived: boolean, ids: string[]) {
  ids.forEach((id, i) => {
    const target = issues.value.find((iss) => iss.id === id && iss.archived === archived);
    if (target) target.priority = i + 1;
  });
}

async function onReorder(payload: { column: ColumnKey; ids: string[]; draggedId: string }) {
  const dragged = issues.value.find((i) => i.id === payload.draggedId);
  if (!dragged) return;
  const archived = dragged.archived;
  const subsetIds = payload.ids.filter((id) => {
    const iss = issues.value.find((x) => x.id === id);
    return iss !== undefined && iss.archived === archived;
  });
  if (subsetIds.length === 0) return;

  // Wontfix-bound reorders wait for the reason modal to confirm.
  if (
    wontfixModalOpen.value &&
    pendingWontfix.value?.issue.id === payload.draggedId &&
    payload.column === 'wontfix'
  ) {
    pendingWontfix.value.targetIds = subsetIds;
    return;
  }

  const full = spliceSubset(archived, payload.column, subsetIds);
  if (full === null) {
    await load();
    return;
  }
  if (full.length === 0) return;
  applyLocalPriorities(archived, full);

  const pendingFlip = pendingStatusFlipByDraggedId.get(payload.draggedId);
  if (pendingFlip && !(await pendingFlip)) return;
  applyReorder(archived, payload.column as Status, full);
}

function onToggleAssignee(issue: Issue) {
  const real = findLive(issue);
  if (!real) return;
  applyAssignee(real, real.assignee === 'agent' ? 'human' : 'agent');
}

async function onConfirmWontfix(reason: string) {
  const pending = pendingWontfix.value;
  wontfixModalOpen.value = false;
  pendingWontfix.value = null;
  if (!pending) return;
  const ok = await applyStatus(pending.issue, 'wontfix', reason);
  if (!ok || !pending.targetIds?.length) return;
  const full = spliceSubset(pending.issue.archived, 'wontfix', pending.targetIds);
  if (full === null) {
    await load();
    return;
  }
  if (full.length === 0) return;
  applyLocalPriorities(pending.issue.archived, full);
  await applyReorder(pending.issue.archived, 'wontfix', full);
}

async function onCancelWontfix() {
  wontfixModalOpen.value = false;
  pendingWontfix.value = null;
  // vuedraggable already moved the card; refetch restores canonical state.
  await load();
}
</script>

<template>
  <div class="app">
    <div v-if="errorMsg" class="banner-error">
      {{ errorMsg }}
      <button style="margin-left: 12px" @click="errorMsg = null">Dismiss</button>
    </div>

    <InboxView
      :issues="issues"
      :projects="projects"
      :specs="specs"
      @refresh="load"
      @open-issue="(iss) => (drawerIssue = iss)"
      @open-backlog="openBacklog"
      @drop="onDrop"
      @reorder="onReorder"
      @toggle-assignee="onToggleAssignee"
    />

    <Drawer
      :issue="drawerIssue"
      @close="drawerIssue = null"
      @send-to-backlog="(iss) => applyStatus(iss, 'backlog')"
    />
    <BacklogDrawer
      :open="backlogIssues !== null"
      :issues="backlogIssues ?? []"
      @close="backlogIssues = null"
      @open-issue="onBacklogOpenIssue"
      @promote="onBacklogPromote"
    />
    <WontfixModal
      :open="wontfixModalOpen"
      :issue-title="pendingWontfix?.issue.title ?? ''"
      @confirm="onConfirmWontfix"
      @cancel="onCancelWontfix"
    />
  </div>
</template>
