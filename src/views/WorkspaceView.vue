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
import IssuePanel from '../components/IssuePanel.vue';
import MenuHost from '../components/MenuHost.vue';
import InboxView from '../components/InboxView.vue';
import SettingsDialog from '../components/SettingsDialog.vue';
import SkippedFilesDialog from '../components/SkippedFilesDialog.vue';
import WontfixModal from '../components/WontfixModal.vue';
import WorkspaceMissing from '../components/WorkspaceMissing.vue';
import type { IssueEdit } from '../issueMenus';
import { singleFlight, useLiveUpdates } from '../live';
import { activeMenu, closeMenu } from '../menu';
import { buildRelations } from '../relations';
import { EDITOR_LABEL, editorChoice, issueEditorUrl } from '../editor';
import { copyWithToast, issuePrompt, projectPrompt } from '../prompts';
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
  type SkippedFile,
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
  root: computed(() => workspace.value?.root ?? ''),
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
// Files the reader couldn't show; the rail counts them (#0071).
const skipped = ref<SkippedFile[]>([]);
const skippedOpen = ref(false);
const panelIssue = ref<Issue | null>(null);
// The list the panel was opened from, so ‹ › and j/k step through it (#0050).
const panelKeys = ref<{ id: string; archived: boolean }[]>([]);
const panelIndex = computed(() =>
  panelIssue.value ? panelKeys.value.findIndex((k) => k.id === panelIssue.value!.id && k.archived === panelIssue.value!.archived) : -1,
);
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
const settingsOpen = ref(false);
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
    skipped.value = data.skipped ?? [];
    if (pendingOpenId) {
      const created = data.issues.find((i) => i.id === pendingOpenId && !i.archived);
      if (created) {
        panelIssue.value = created;
        pendingOpenId = null;
      }
    }
    if (pendingProject && data.projects.some((p) => p.slug === pendingProject)) {
      paneRequest.value = { slug: pendingProject, tab: 'prd', nonce: Date.now() };
      pendingProject = null;
    }
    // Keep an open drawer on the fresh copy so live edits show in it.
    if (panelIssue.value) {
      const open = panelIssue.value;
      panelIssue.value = data.issues.find((i) => i.id === open.id && i.archived === open.archived) ?? open;
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

// Always one action away (#0072): ⌘K and a click on the live indicator.
const refresh = singleFlight(async () => {
  await load();
  if (!errorFromLoad) toast('Refreshed');
});

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
  panelIssue.value = null;
  backlogIssues.value = null;
  workspace.value = null;
  issues.value = [];
  projects.value = [];
  specs.value = [];
  skipped.value = [];
  skippedOpen.value = false;
  views.value = [];
  load();
  void loadViews();
});

function anyDialogOpen(): boolean {
  return wontfixModalOpen.value || createOpen.value || projectDialogOpen.value || paletteOpen.value || settingsOpen.value || skippedOpen.value || activeMenu.value !== null;
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
  else if (panelIssue.value) panelIssue.value = null;
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

function copy(text: string) {
  return copyWithToast(text, 'Agent prompt copied');
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

function openIssue(issue: Issue, list?: Issue[]) {
  backlogIssues.value = null;
  if (list) panelKeys.value = list.map((i) => ({ id: i.id, archived: i.archived }));
  else if (!panelKeys.value.some((k) => k.id === issue.id && k.archived === issue.archived)) panelKeys.value = [];
  panelIssue.value = findLive(issue) ?? issue;
}

function stepPanel(delta: number) {
  const key = panelKeys.value[panelIndex.value + delta];
  const next = key && issues.value.find((i) => i.id === key.id && i.archived === key.archived);
  if (next) panelIssue.value = next;
}

function openPage(issue: Issue) {
  panelIssue.value = null;
  closeMenu();
  void router.push({ path: `/w/${workspaceId.value}/issues/${issue.id}`, query: issue.archived ? { archived: '1' } : {} });
}

// Inline pickers and context menus (#0052, #0055): status and assignee use the
// board's writes; labels, project and parent are optimistic with rollback.
async function updateIssue(issue: Issue, edit: IssueEdit) {
  const target = findLive(issue) ?? issue;
  if (edit.status) moveTo(target, edit.status);
  if (edit.assignee) void applyAssignee(target, edit.assignee);
  const patch: { labels?: string[]; project?: string | null; parent?: string | null } = {};
  if (edit.labels) patch.labels = edit.labels;
  if (edit.project !== undefined) patch.project = edit.project || null;
  if (edit.parent !== undefined) patch.parent = edit.parent || null;
  if (!Object.keys(patch).length) return;
  const before = { labels: target.labels, project: target.project, parent: target.parent };
  if (patch.labels) target.labels = patch.labels;
  if ('project' in patch) target.project = patch.project ?? undefined;
  if ('parent' in patch) target.parent = patch.parent ?? undefined;
  try {
    await patchIssue(workspaceId.value, target.id, target.archived, patch);
  } catch (e) {
    Object.assign(target, before);
    errorMsg.value = (e as Error).message;
    await load();
  }
}

watch(
  () => props.view,
  (v) => {
    if (v === 'issue') panelIssue.value = null;
  },
);

provideIssueActions({
  openIssue,
  openPage,
  updateIssue: (issue, edit) => void updateIssue(issue, edit),
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

const contextIssue = computed(() => panelIssue.value ?? selectedIssue.value);

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
        status,
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
    const editorLink = workspace.value ? issueEditorUrl(editorChoice.value, workspace.value.root, issue) : null;
    if (editorLink) {
      list.push({ id: 'open-editor', title: `${ctx}: open in ${EDITOR_LABEL[editorChoice.value]}`, group: 'Selected issue', keywords: 'editor vscode cursor file', run: () => (window.location.href = editorLink) });
    }
    if (issue.status === 'done') {
      list.push({
        id: 'reviewed',
        title: `${ctx}: ${issue.reviewed ? 'unmark reviewed' : 'mark reviewed'}`,
        group: 'Selected issue',
        run: () => void setReviewed(issue, !issue.reviewed),
      });
    }
    if (panelIssue.value?.id !== issue.id) {
      list.push({ id: 'open-selected', title: `${ctx}: open`, group: 'Selected issue', run: () => openIssue(issue) });
    }
    list.push({ id: 'open-page', title: `${ctx}: open as page`, group: 'Selected issue', keywords: 'full page expand', run: () => openPage(issue) });
  }
  list.push(
    { id: 'new-issue', title: 'New issue', group: 'Actions', hint: SHORTCUTS.create.display, run: () => openCreate(false) },
    { id: 'new-backlog', title: 'New backlog idea', group: 'Actions', run: () => openCreate(true) },
    { id: 'new-project', title: 'New project', group: 'Actions', run: () => (projectDialogOpen.value = true) },
    { id: 'refresh', title: 'Refresh', group: 'Actions', keywords: 'reload refetch update live', run: () => void refresh() },
    { id: 'go-inbox', title: 'Go to Inbox', group: 'Actions', keywords: 'feed', run: () => router.push(`/w/${ws}`) },
    { id: 'go-specs', title: 'Go to Specs', group: 'Actions', run: () => router.push(`/w/${ws}/specs`) },
    { id: 'go-issues', title: 'Go to Issues (list)', group: 'Actions', keywords: 'list table', run: () => router.push(`/w/${ws}/issues`) },
    { id: 'go-projects', title: 'Go to Projects', group: 'Actions', keywords: 'overview progress', run: () => router.push(`/w/${ws}/projects`) },
    { id: 'theme', title: `Theme: ${themeChoice.value} → ${themeChoice.value === 'system' ? 'dark' : themeChoice.value === 'dark' ? 'light' : 'system'}`, group: 'Actions', keywords: 'dark light mode appearance', run: () => toast(`Theme: ${cycleTheme()}`) },
    { id: 'settings', title: 'Settings', group: 'Actions', keywords: 'preferences theme editor vscode cursor', run: () => (settingsOpen.value = true) },
    { id: 'go-help', title: 'Open Help', group: 'Actions', hint: SHORTCUTS.help.display, run: () => router.push({ path: '/help', query: { from: ws } }) },
  );
  if (skipped.value.length) {
    list.push({ id: 'skipped', title: 'Show skipped files', group: 'Actions', keywords: 'malformed unreadable invalid missing hidden', run: () => (skippedOpen.value = true) });
  }
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
      status: i.status,
      keywords: `${i.labels.join(' ')} ${i.project ?? ''}`,
      run: () => openIssue(i),
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
  panelIssue.value = null;
  backlogIssues.value = list;
}

function onBacklogOpenIssue(iss: Issue) {
  openIssue(iss);
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
      :skipped="skipped"
      :live="liveState"
      :request="paneRequest"
      @refresh="refresh"
      @selection="(iss) => (selectedIssue = iss)"
      @pane-project="(slug) => (paneProject = slug)"
      @new-issue="openCreate(false)"
      @new-project="projectDialogOpen = true"
      @settings="settingsOpen = true"
      @skipped="skippedOpen = true"
      @open-issue="openIssue"
      @open-backlog="openBacklog"
      @drop="onDrop"
      @reorder="onReorder"
      @toggle-assignee="onToggleAssignee"
    />

    <IssuePanel
      v-if="panelIssue && props.view !== 'issue'"
      :issue="panelIssue"
      :position="panelIndex + 1"
      :total="panelIndex >= 0 ? panelKeys.length : 0"
      @close="panelIssue = null"
      @expand="panelIssue && openPage(panelIssue)"
      @prev="stepPanel(-1)"
      @next="stepPanel(1)"
    />
    <MenuHost />
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
    <SettingsDialog :open="settingsOpen" @close="settingsOpen = false" />
    <SkippedFilesDialog :open="skippedOpen" :files="skipped" @close="skippedOpen = false" />
    <WontfixModal
      :open="wontfixModalOpen"
      :issue-title="pendingWontfix?.issue.title ?? ''"
      @confirm="onConfirmWontfix"
      @cancel="onCancelWontfix"
    />
  </div>
</template>
