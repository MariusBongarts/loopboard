<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { provideIssueActions } from '../actions';
import { fetchData, fetchViews, fetchWorkspaces, patchIssue, reorderColumn, storeViews, type SavedView } from '../api';
import type { Command } from '../commands';
import BacklogDrawer from '../components/BacklogDrawer.vue';
import CommandPalette from '../components/CommandPalette.vue';
import CreateIssueDialog from '../components/CreateIssueDialog.vue';
import CreateProjectDialog from '../components/CreateProjectDialog.vue';
import Drawer from '../components/Drawer.vue';
import InboxView from '../components/InboxView.vue';
import WontfixModal from '../components/WontfixModal.vue';
import WorkspaceMissing from '../components/WorkspaceMissing.vue';
import { useLiveUpdates } from '../live';
import { buildRelations } from '../relations';
import { copyText, issuePrompt, projectPrompt } from '../prompts';
import { isShortcut, isTyping, SHORTCUTS } from '../shortcuts';
import { toast } from '../toast';
import { cycleTheme, themeChoice } from '../theme';
import { provideWorkspace, rootNameOf, type View } from '../workspace';
import {
  byPriority,
  columnForStatus,
  type Assignee,
  type ColumnKey,
  type Issue,
  type Project,
  type Spec,
  ALL_STATUSES,
  COLUMN_LABEL,
  type Status,
  type WorkspaceSummary,
} from '../types';

const props = defineProps<{ view: View }>();
const route = useRoute();
const router = useRouter();
const workspaceId = computed(() => String(route.params.ws));
const workspace = ref<WorkspaceSummary | null>(null);
const issues = ref<Issue[]>([]);
const projects = ref<Project[]>([]);
const views = ref<SavedView[]>([]);
provideWorkspace({
  id: workspaceId,
  rootName: computed(() => (workspace.value ? rootNameOf(workspace.value) : '.agents')),
  issues,
  projects,
  relations: computed(() => buildRelations(issues.value)),
  views,
  saveViews: async (next) => {
    try {
      views.value = await storeViews(workspaceId.value, next);
    } catch (e) {
      errorMsg.value = (e as Error).message;
    }
  },
});

async function loadViews() {
  try {
    views.value = await fetchViews(workspaceId.value);
  } catch {
    views.value = [];
  }
}
const specs = ref<Spec[]>([]);
const drawerIssue = ref<Issue | null>(null);
const backlogIssues = ref<Issue[] | null>(null);
const errorMsg = ref<string | null>(null);
// A successful reload clears only its own load errors, never a write's (#0004 spec).
let errorFromLoad = false;
const wontfixModalOpen = ref(false);
const pendingWontfix = ref<{ issue: Issue; targetIds?: string[] } | null>(null);
const createOpen = ref(false);
const createInBacklog = ref(false);
const projectDialogOpen = ref(false);
const paletteOpen = ref(false);
const paletteWorkspaces = ref<WorkspaceSummary[]>([]);
// What the inbox shows, reported up so actions know their context.
const selectedIssue = ref<Issue | null>(null);
const paneProject = ref<string | null>(null);
// Requests down to the inbox: show a project (and a tab) once it exists.
const paneRequest = ref<{ slug: string; tab: 'board' | 'prd'; nonce: number } | null>(null);
let pendingOpenId: string | null = null;
let pendingProject: string | null = null;

async function load() {
  const id = workspaceId.value;
  try {
    const data = await fetchData(id);
    if (id !== workspaceId.value) return;
    workspace.value = data.workspace;
    issues.value = data.issues;
    projects.value = data.projects;
    specs.value = data.specs ?? [];
    if (pendingOpenId) {
      const created = data.issues.find((i) => i.id === pendingOpenId && !i.archived);
      if (created) {
        drawerIssue.value = created;
        pendingOpenId = null;
      }
    }
    if (pendingProject && data.projects.some((p) => p.slug === pendingProject)) {
      paneRequest.value = { slug: pendingProject, tab: 'prd', nonce: Date.now() };
      pendingProject = null;
    }
    // Keep an open drawer on the fresh copy so live edits show in it.
    if (drawerIssue.value) {
      const open = drawerIssue.value;
      drawerIssue.value = data.issues.find((i) => i.id === open.id && i.archived === open.archived) ?? open;
    }
    if (errorFromLoad) {
      errorMsg.value = null;
      errorFromLoad = false;
    }
    document.title = `${data.workspace.name} · loopboard`;
  } catch (e) {
    errorMsg.value = (e as Error).message;
    errorFromLoad = true;
  }
}

let reloadTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleReload() {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    load();
  }, 80);
}
const { state: liveState } = useLiveUpdates(workspaceId, scheduleReload);

// A missing root can't be watched, so poll until it's back (#0015).
let missingTimer: ReturnType<typeof setInterval> | null = null;
watch(
  () => workspace.value?.available,
  (available) => {
    if (missingTimer) clearInterval(missingTimer);
    missingTimer = available === false ? setInterval(load, 3000) : null;
  },
);
onUnmounted(() => {
  if (missingTimer) clearInterval(missingTimer);
});

watch(workspaceId, () => {
  drawerIssue.value = null;
  backlogIssues.value = null;
  workspace.value = null;
  issues.value = [];
  projects.value = [];
  specs.value = [];
  views.value = [];
  load();
  void loadViews();
});

function anyDialogOpen(): boolean {
  return wontfixModalOpen.value || createOpen.value || projectDialogOpen.value || paletteOpen.value;
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (isShortcut(e, 'palette')) {
    e.preventDefault();
    if (!paletteOpen.value) openPalette();
    else paletteOpen.value = false;
    return;
  }
  if (isShortcut(e, 'create') && !isTyping(e) && !anyDialogOpen()) {
    e.preventDefault();
    openCreate(false);
    return;
  }
  if (e.key !== 'Escape' || anyDialogOpen()) return;
  if (backlogIssues.value) backlogIssues.value = null;
  else if (drawerIssue.value) drawerIssue.value = null;
}

function openCreate(backlog: boolean) {
  createInBacklog.value = backlog;
  createOpen.value = true;
}

function onCreated(id: string) {
  createOpen.value = false;
  pendingOpenId = id;
  toast(`Created #${id}`);
  scheduleReload();
}

function onProjectCreated(slug: string) {
  projectDialogOpen.value = false;
  pendingProject = slug;
  toast(`Created project ${slug}`);
  scheduleReload();
}

async function openPalette() {
  paletteOpen.value = true;
  try {
    paletteWorkspaces.value = (await fetchWorkspaces()).workspaces;
  } catch {
    paletteWorkspaces.value = [];
  }
}

async function copy(text: string) {
  toast((await copyText(text)) ? 'Agent prompt copied' : "Couldn't copy — your browser blocked the clipboard");
}

async function setReviewed(issue: Issue, reviewed: boolean) {
  const target = findLive(issue);
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  try {
    await patchIssue(workspaceId.value, issue.id, issue.archived, { reviewed: reviewed ? date : null });
    if (target) target.reviewed = reviewed ? date : undefined;
  } catch (e) {
    errorMsg.value = (e as Error).message;
    await load();
  }
}

provideIssueActions({
  openIssue: (issue) => {
    backlogIssues.value = null;
    drawerIssue.value = issue;
  },
  copyIssuePrompt: (issue) => void copy(issuePrompt(issue)),
  copyProjectPrompt: (project) => void copy(projectPrompt(project, issues.value)),
  setReviewed: (issue, reviewed) => void setReviewed(issue, reviewed),
});

function moveTo(issue: Issue, status: Status) {
  if (status === 'wontfix') {
    pendingWontfix.value = { issue };
    wontfixModalOpen.value = true;
  } else void applyStatus(issue, status);
}

const contextIssue = computed(() => drawerIssue.value ?? selectedIssue.value);

const commands = computed<Command[]>(() => {
  const ws = workspaceId.value;
  const list: Command[] = [];
  const issue = contextIssue.value;
  if (issue && !issue.archived) {
    const ctx = `#${issue.id}`;
    for (const status of ALL_STATUSES) {
      if (status === issue.status) continue;
      list.push({
        id: `move-${status}`,
        title: `${ctx}: move to ${COLUMN_LABEL[status]}`,
        group: 'Selected issue',
        keywords: `status ${status}`,
        run: () => moveTo(issue, status),
      });
    }
    list.push({
      id: 'assign',
      title: `${ctx}: assign to ${issue.assignee === 'agent' ? 'you' : 'the agent'}`,
      group: 'Selected issue',
      keywords: 'assignee human agent',
      run: () => applyAssignee(issue, issue.assignee === 'agent' ? 'human' : 'agent'),
    });
    list.push({ id: 'prompt', title: `${ctx}: copy agent prompt`, group: 'Selected issue', run: () => void copy(issuePrompt(issue)) });
    if (issue.status === 'done') {
      list.push({
        id: 'reviewed',
        title: `${ctx}: ${issue.reviewed ? 'unmark reviewed' : 'mark reviewed'}`,
        group: 'Selected issue',
        run: () => void setReviewed(issue, !issue.reviewed),
      });
    }
    if (drawerIssue.value?.id !== issue.id) {
      list.push({ id: 'open-selected', title: `${ctx}: open`, group: 'Selected issue', run: () => (drawerIssue.value = issue) });
    }
  }
  list.push(
    { id: 'new-issue', title: 'New issue', group: 'Actions', hint: SHORTCUTS.create.display, run: () => openCreate(false) },
    { id: 'new-backlog', title: 'New backlog idea', group: 'Actions', run: () => openCreate(true) },
    { id: 'new-project', title: 'New project', group: 'Actions', run: () => (projectDialogOpen.value = true) },
    { id: 'go-inbox', title: 'Go to Inbox', group: 'Actions', keywords: 'feed', run: () => router.push(`/w/${ws}`) },
    { id: 'go-specs', title: 'Go to Specs', group: 'Actions', run: () => router.push(`/w/${ws}/specs`) },
    { id: 'go-issues', title: 'Go to Issues (list)', group: 'Actions', keywords: 'list table', run: () => router.push(`/w/${ws}/issues`) },
    { id: 'go-projects', title: 'Go to Projects', group: 'Actions', keywords: 'overview progress', run: () => router.push(`/w/${ws}/projects`) },
    { id: 'theme', title: `Theme: ${themeChoice.value} → ${themeChoice.value === 'system' ? 'dark' : themeChoice.value === 'dark' ? 'light' : 'system'}`, group: 'Actions', keywords: 'dark light mode appearance', run: () => toast(`Theme: ${cycleTheme()}`) },
    { id: 'go-help', title: 'Open Help', group: 'Actions', hint: SHORTCUTS.help.display, run: () => router.push({ path: '/help', query: { from: ws } }) },
  );
  for (const w of paletteWorkspaces.value) {
    if (w.id === ws) continue;
    list.push({ id: `ws-${w.id}`, title: `Switch to ${w.name}`, group: 'Workspaces', keywords: w.id, run: () => router.push(`/w/${w.id}`) });
  }
  for (const i of issues.value) {
    if (i.archived) continue;
    list.push({
      id: `issue-${i.id}`,
      title: `#${i.id} ${i.title}`,
      group: 'Issues',
      hint: i.status,
      keywords: `${i.labels.join(' ')} ${i.project ?? ''}`,
      run: () => (drawerIssue.value = i),
    });
  }
  for (const p of projects.value) {
    list.push({
      id: `project-${p.slug}`,
      title: p.title,
      group: 'Projects',
      hint: p.slug.slice(0, 2),
      keywords: p.slug,
      run: () => (paneRequest.value = { slug: p.slug, tab: 'board', nonce: Date.now() }),
    });
  }
  for (const v of views.value) {
    list.push({ id: `view-${v.id}`, title: v.name, group: 'Views', run: () => router.push({ path: `/w/${ws}/issues`, query: { ...v.query, view: v.id } }) });
  }
  for (const sp of specs.value) {
    list.push({ id: `spec-${sp.id}`, title: sp.title, group: 'Specs', run: () => router.push({ path: `/w/${ws}/specs`, query: { spec: sp.id } }) });
  }
  return list;
});

onMounted(() => {
  load();
  void loadViews();
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
    await patchIssue(workspaceId.value, issue.id, issue.archived, { status, reason });
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
    await patchIssue(workspaceId.value, issue.id, issue.archived, { assignee });
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
    await reorderColumn(workspaceId.value, archived, status, ids);
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

    <WorkspaceMissing v-if="workspace && !workspace.available" :workspace="workspace" />
    <InboxView
      v-else
      :key="workspaceId"
      :view="props.view"
      :workspace="workspace"
      :issues="issues"
      :projects="projects"
      :specs="specs"
      :live="liveState"
      :request="paneRequest"
      @refresh="load"
      @selection="(iss) => (selectedIssue = iss)"
      @pane-project="(slug) => (paneProject = slug)"
      @new-issue="openCreate(false)"
      @new-project="projectDialogOpen = true"
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
    <CreateIssueDialog
      :open="createOpen"
      :projects="projects"
      :default-project="paneProject"
      :backlog="createInBacklog"
      @close="createOpen = false"
      @created="onCreated"
    />
    <CreateProjectDialog :open="projectDialogOpen" @close="projectDialogOpen = false" @created="onProjectCreated" />
    <CommandPalette :open="paletteOpen" :commands="commands" @close="paletteOpen = false" />
    <WontfixModal
      :open="wontfixModalOpen"
      :issue-title="pendingWontfix?.issue.title ?? ''"
      @confirm="onConfirmWontfix"
      @cancel="onCancelWontfix"
    />
  </div>
</template>
