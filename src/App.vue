<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  fetchData,
  patchIssueAssignee,
  patchIssueStatus,
  reorderColumn,
} from './api';
import { toneClass } from './colors';
import BacklogDrawer from './components/BacklogDrawer.vue';
import Column from './components/Column.vue';
import Drawer from './components/Drawer.vue';
import ProjectDrawer from './components/ProjectDrawer.vue';
import SpecsView from './components/SpecsView.vue';
import WontfixModal from './components/WontfixModal.vue';
import AgentIcon from './components/icons/AgentIcon.vue';
import HumanIcon from './components/icons/HumanIcon.vue';
import {
  ALL,
  ALWAYS_VISIBLE_COLUMNS,
  ASSIGNEES,
  COLUMN_ORDER,
  STANDALONE,
  aggregateCoverage,
  columnForStatus,
  searchMatches,
  tokenizeQuery,
  type Assignee,
  type ColumnKey,
  type Issue,
  type Project,
  type Spec,
  type Status,
} from './types';

type Mode = 'board' | 'specs';
const MODE_KEY = 'tracker.mode';

const issues = ref<Issue[]>([]);
const projects = ref<Project[]>([]);
const specs = ref<Spec[]>([]);
const mode = ref<Mode>(
  ((): Mode => {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === 'specs' || saved === 'board') return saved;
    } catch {
      /* ignore */
    }
    return 'board';
  })(),
);
const specsViewRef = ref<InstanceType<typeof SpecsView> | null>(null);

watch(mode, (m) => {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    /* ignore */
  }
});

const specsAggregate = computed(() => aggregateCoverage(specs.value));
const filter = ref<string>(ALL);
const assigneeFilter = ref<'all' | Assignee>('all');
const showArchived = ref(false);
const rawQuery = ref('');
const debouncedQuery = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const drawerIssue = ref<Issue | null>(null);
const projectDrawerSlug = ref<string | null>(null);
const backlogDrawerOpen = ref(false);
const errorMsg = ref<string | null>(null);
const wontfixModalOpen = ref(false);
const pendingWontfix = ref<{ issue: Issue; targetIds?: string[] } | null>(null);
// Sticky-bar shadow cue (#0142): the masthead + filter rows are
// already pinned via flex layout (`.app` is height: 100vh, `.board`
// is the only scrollable child). The cue we add is a soft drop
// shadow under the sticky region once the board has scrolled past
// the top — gives the maintainer a "you can scroll back up" hint
// without putting visual weight on the rule when the board is at 0.
const boardEl = ref<HTMLElement | null>(null);
const boardScrolled = ref(false);
function onBoardScroll() {
  if (!boardEl.value) return;
  const isScrolled = boardEl.value.scrollTop > 0;
  if (isScrolled !== boardScrolled.value) boardScrolled.value = isScrolled;
}

// Shortcut-help popover (#0144) — a `?` next to the search box that
// reveals the existing keyboard shortcuts. Outside-click and Esc both
// close it.
const shortcutHelpOpen = ref(false);
function toggleShortcutHelp(e: MouseEvent) {
  e.stopPropagation();
  shortcutHelpOpen.value = !shortcutHelpOpen.value;
}
function closeShortcutHelp() {
  shortcutHelpOpen.value = false;
}
function onDocumentMousedown(e: MouseEvent) {
  if (!shortcutHelpOpen.value) return;
  const target = e.target as HTMLElement | null;
  if (!target?.closest('.shortcut-help')) shortcutHelpOpen.value = false;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(rawQuery, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = val;
  }, 80);
});

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

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (
    e.key === '/' &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.altKey &&
    !isTypingTarget(e.target)
  ) {
    e.preventDefault();
    if (mode.value === 'specs') {
      specsViewRef.value?.focusSearch();
    } else {
      searchInput.value?.focus();
      searchInput.value?.select();
    }
  }
  if (e.key === 'Escape' && shortcutHelpOpen.value) {
    closeShortcutHelp();
    return;
  }
  if (
    e.key === 'Escape' &&
    backlogDrawerOpen.value &&
    !isTypingTarget(e.target)
  ) {
    closeBacklogDrawer();
    return;
  }
  if (
    e.key === 'Escape' &&
    projectDrawerSlug.value &&
    !isTypingTarget(e.target)
  ) {
    closeProjectDrawer();
  }
}

function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    rawQuery.value = '';
    debouncedQuery.value = '';
  }
}

function clearSearch() {
  rawQuery.value = '';
  debouncedQuery.value = '';
  searchInput.value?.focus();
}

// One-click reset of every non-default filter (#0144). Surfaced in
// the masthead whenever any filter is non-default. Mirrors what
// `Esc` already does for search-only.
const hasNonDefaultFilters = computed(
  () =>
    rawQuery.value.trim() !== '' ||
    assigneeFilter.value !== 'all' ||
    filter.value !== ALL ||
    showArchived.value,
);
function clearAllFilters() {
  rawQuery.value = '';
  debouncedQuery.value = '';
  assigneeFilter.value = 'all';
  filter.value = ALL;
  showArchived.value = false;
}

onMounted(() => {
  load();
  window.addEventListener('keydown', onGlobalKeydown);
  document.addEventListener('mousedown', onDocumentMousedown);
});
onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
  document.removeEventListener('mousedown', onDocumentMousedown);
  if (debounceTimer) clearTimeout(debounceTimer);
});

function isProjectWrappedUp(slug: string): boolean {
  const projectIssues = issues.value.filter((i) => i.project === slug);
  if (projectIssues.length === 0) return false;
  return projectIssues.every(
    (i) => i.archived || i.status === 'done' || i.status === 'wontfix',
  );
}

const visibleProjects = computed(() => {
  if (showArchived.value) return projects.value;
  return projects.value.filter(
    (p) => p.status !== 'shipped' && !isProjectWrappedUp(p.slug),
  );
});

watch(visibleProjects, (vis) => {
  if (filter.value === ALL || filter.value === STANDALONE) return;
  if (!vis.some((p) => p.slug === filter.value)) {
    filter.value = ALL;
  }
});

// "Project doc" button is only meaningful when the active filter
// resolves to one real project — not All, not Standalone, not a
// stale slug after a refresh.
const activeProject = computed<Project | null>(() => {
  if (filter.value === ALL || filter.value === STANDALONE) return null;
  return projects.value.find((p) => p.slug === filter.value) ?? null;
});

// The drawer reads from `projects.value` by slug so that a Refresh
// re-pulls fresh prdBody / wipBody under the open drawer.
const projectDrawerProject = computed<Project | null>(() => {
  if (!projectDrawerSlug.value) return null;
  return projects.value.find((p) => p.slug === projectDrawerSlug.value) ?? null;
});

function openProjectDrawer() {
  if (!activeProject.value) return;
  // Mutual exclusivity (#0145): close the Backlog drawer if it's open.
  backlogDrawerOpen.value = false;
  projectDrawerSlug.value = activeProject.value.slug;
}

function closeProjectDrawer() {
  projectDrawerSlug.value = null;
}

function onProjectDrawerOpenIssue(iss: Issue) {
  // Mutual exclusivity: closing the project drawer first keeps Esc
  // unambiguous (only one drawer is ever open at a time).
  projectDrawerSlug.value = null;
  backlogDrawerOpen.value = false;
  drawerIssue.value = iss;
}

function onBacklogDrawerOpenIssue(iss: Issue) {
  // Click an issue title inside the backlog drawer → close backlog,
  // open the issue drawer underneath. Same pattern as project drawer.
  backlogDrawerOpen.value = false;
  drawerIssue.value = iss;
}

function onBacklogDrawerPromote(iss: Issue) {
  // Promote → todo via the existing PATCH endpoint.
  applyStatus(iss, 'todo');
}

const chipFilteredIssues = computed(() => {
  return issues.value.filter((iss) => {
    // Backlog issues live in the BacklogDrawer, never on the board (#0145).
    if (iss.status === 'backlog') return false;
    // Archive toggle gates two things: archived files and wontfix
    // status (terminal — same "still in motion?" cut as archive).
    if (!showArchived.value && iss.archived) return false;
    if (!showArchived.value && iss.status === 'wontfix') return false;
    if (assigneeFilter.value !== 'all' && iss.assignee !== assigneeFilter.value)
      return false;
    if (filter.value === ALL) return true;
    if (filter.value === STANDALONE) return !iss.project;
    return iss.project === filter.value;
  });
});

// Backlog drawer issues (#0145). Respects the same project, assignee,
// and search filters so "what backlog is on my plate?" matches the
// active board view. Archive toggle does NOT gate backlog visibility —
// the Backlog button is the only path to backlog issues.
const backlogIssues = computed(() => {
  return issues.value.filter((iss) => {
    if (iss.status !== 'backlog') return false;
    if (iss.archived && !showArchived.value) return false;
    if (assigneeFilter.value !== 'all' && iss.assignee !== assigneeFilter.value)
      return false;
    if (filter.value === STANDALONE && iss.project) return false;
    if (
      filter.value !== ALL &&
      filter.value !== STANDALONE &&
      iss.project !== filter.value
    )
      return false;
    if (queryTokens.value.length > 0 && !searchMatches(iss, queryTokens.value))
      return false;
    return true;
  });
});

function backlogCount(): number {
  return backlogIssues.value.length;
}

function openBacklogDrawer() {
  // Mutual exclusivity: any other drawer closes first so Esc is
  // unambiguous (only one drawer ever open at a time).
  drawerIssue.value = null;
  projectDrawerSlug.value = null;
  backlogDrawerOpen.value = true;
}

function closeBacklogDrawer() {
  backlogDrawerOpen.value = false;
}

const queryTokens = computed(() => tokenizeQuery(debouncedQuery.value));
const hasActiveQuery = computed(() => queryTokens.value.length > 0);

const filteredIssues = computed(() => {
  if (!hasActiveQuery.value) return chipFilteredIssues.value;
  return chipFilteredIssues.value.filter((iss) =>
    searchMatches(iss, queryTokens.value),
  );
});

// Board-surface counts exclude backlog (their home is the BacklogDrawer
// — counting them in chip badges would imply they're on the board).
function projectIssueCount(slug: string): number {
  return issues.value.filter(
    (i) =>
      i.project === slug &&
      i.status !== 'backlog' &&
      (showArchived.value || !i.archived),
  ).length;
}

function standaloneCount(): number {
  return issues.value.filter(
    (i) =>
      !i.project &&
      i.status !== 'backlog' &&
      (showArchived.value || !i.archived),
  ).length;
}

function allCount(): number {
  return issues.value.filter(
    (i) => i.status !== 'backlog' && (showArchived.value || !i.archived),
  ).length;
}

function assigneeCount(value: 'all' | Assignee): number {
  return issues.value.filter((i) => {
    if (i.status === 'backlog') return false;
    if (!showArchived.value && i.archived) return false;
    if (!showArchived.value && i.status === 'wontfix') return false;
    if (value === 'all') return true;
    return i.assignee === value;
  }).length;
}

function issuesIn(col: ColumnKey): Issue[] {
  return filteredIssues.value
    .filter((iss) => columnForStatus(iss.status) === col)
    .sort((a, b) => {
      const pa = a.priority ?? Number.POSITIVE_INFINITY;
      const pb = b.priority ?? Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return a.id.localeCompare(b.id);
    });
}

const occupiedStatuses = computed<Set<Status>>(() => {
  const s = new Set<Status>();
  for (const iss of filteredIssues.value) s.add(iss.status);
  return s;
});

const visibleColumns = computed<ColumnKey[]>(() => {
  const occ = occupiedStatuses.value;
  return COLUMN_ORDER.filter((col) => {
    if (ALWAYS_VISIBLE_COLUMNS.includes(col)) return true;
    // wontfix is the only archive-only column; all other statuses are
    // pinned to the always-visible set so the board shape is stable.
    if (col === 'wontfix') return showArchived.value && occ.has('wontfix');
    return false;
  });
});

const boardGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${visibleColumns.value.length}, minmax(240px, 1fr))`,
}));

async function applyStatus(
  issue: Issue,
  status: Status,
  reason?: string,
): Promise<boolean> {
  // Optimistic-first: flip target.status synchronously so a follow-up
  // onReorder running in the same tick can observe the new bucket when
  // it computes the full column order. Vue batches the resulting watch
  // run, so the optimistic priority update onReorder applies in the same
  // tick reaches the watcher together — no visual snap of the dropped card.
  const target = issues.value.find(
    (i) => i.id === issue.id && i.archived === issue.archived,
  );
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

// Tracks an in-flight cross-column status flip keyed by dragged issue id.
// onReorder consults this so the reorder PATCH waits for the status PATCH
// to land — otherwise the server's bucket validation reads the dragged
// issue from its old (pre-flip) bucket and rejects with 400.
const pendingStatusFlipByDraggedId = new Map<string, Promise<boolean>>();

async function applyAssignee(issue: Issue, assignee: Assignee) {
  try {
    await patchIssueAssignee(issue.id, issue.archived, assignee);
    const target = issues.value.find(
      (i) => i.id === issue.id && i.archived === issue.archived,
    );
    if (target) target.assignee = assignee;
  } catch (e) {
    errorMsg.value = (e as Error).message;
    await load();
  }
}

function onDrop(payload: { issue: Issue; column: ColumnKey }) {
  const real = issues.value.find(
    (i) => i.id === payload.issue.id && i.archived === payload.issue.archived,
  );
  if (!real) return;
  if (columnForStatus(real.status) === payload.column) return; // no-op

  // Direct drop on `wontfix` column: status change requires a reason.
  // The follow-up `reorder` event will be deferred until the modal confirms.
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

async function applyReorder(
  archived: boolean,
  status: Status,
  ids: string[],
): Promise<void> {
  try {
    await reorderColumn(archived, status, ids);
  } catch (e) {
    errorMsg.value = (e as Error).message;
    await load();
  }
}

async function onReorder(payload: {
  column: ColumnKey;
  ids: string[];
  draggedId: string;
}) {
  const dragged = issues.value.find((i) => i.id === payload.draggedId);
  if (!dragged) return;

  // Only renumber the dragged item's archived bucket. Items in the other
  // bucket within the same column (possible when the archive toggle is on)
  // keep their existing priorities — the dragged item's bucket gets a
  // dense 1..N rewrite based on the user's drop position.
  const archived = dragged.archived;
  const subsetIds = payload.ids.filter((id) => {
    const iss = issues.value.find((x) => x.id === id);
    return iss !== undefined && iss.archived === archived;
  });
  if (subsetIds.length === 0) return;

  // Defer wontfix-bound reorders: the WontfixModal must confirm before any
  // file write happens, otherwise the server rejects the reorder (the
  // dragged issue isn't in the wontfix bucket on disk yet).
  if (
    wontfixModalOpen.value &&
    pendingWontfix.value &&
    pendingWontfix.value.issue.id === payload.draggedId &&
    payload.column === 'wontfix'
  ) {
    pendingWontfix.value.targetIds = subsetIds;
    return;
  }

  // The payload is the FILTERED view's order (project / assignee / search
  // chips reduce what Column.vue sees). The reorder endpoint validates
  // against the full bucket on disk. Splice the subset's new order back
  // into the full bucket order: walk the full bucket, replacing each
  // subset-member slot with the next id from the user's new subset order.
  // Non-subset items (other projects, hidden assignees) keep their
  // absolute positions in the column.
  const fullOrder = issues.value
    .filter(
      (iss) =>
        iss.archived === archived &&
        iss.status !== 'backlog' &&
        columnForStatus(iss.status) === payload.column,
    )
    .sort((a, b) => {
      const pa = a.priority ?? Number.POSITIVE_INFINITY;
      const pb = b.priority ?? Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return a.id.localeCompare(b.id);
    })
    .map((i) => i.id);

  const subsetSet = new Set(subsetIds);
  let subsetCursor = 0;
  const fullPayload = fullOrder.map((id) =>
    subsetSet.has(id) ? subsetIds[subsetCursor++] : id,
  );

  // Sanity check: every subset id should have been spliced. If not, the
  // local view is out of sync with the bucket — refetch and bail.
  if (subsetCursor !== subsetIds.length) {
    await load();
    return;
  }

  // No-op guard: the bucket order didn't actually change.
  if (fullPayload.every((id, idx) => id === fullOrder[idx])) return;

  // Optimistic local priority update across the full bucket — applied
  // synchronously before any await so Column.vue's watch (which runs as a
  // batched microtask) sees both the new status and the new priorities at
  // once, and resyncs localIssues to the user's intended position with no
  // visual snap.
  for (let i = 0; i < fullPayload.length; i++) {
    const target = issues.value.find(
      (iss) => iss.id === fullPayload[i] && iss.archived === archived,
    );
    if (target) target.priority = i + 1;
  }

  // Cross-column drop coordination: when this reorder rides on a status
  // flip (drop + reorder fire in the same vuedraggable @change tick), the
  // server's bucket validation reads from disk, so we must wait for the
  // status PATCH to land before sending the reorder PATCH — otherwise
  // it 400s with "ids do not match the current bucket".
  const pendingFlip = pendingStatusFlipByDraggedId.get(payload.draggedId);
  if (pendingFlip) {
    const ok = await pendingFlip;
    if (!ok) return; // status flip failed; load() already reconciled
  }

  applyReorder(archived, payload.column as Status, fullPayload);
}

function onToggleAssignee(issue: Issue) {
  const real = issues.value.find(
    (i) => i.id === issue.id && i.archived === issue.archived,
  );
  if (!real) return;
  const next: Assignee = real.assignee === 'agent' ? 'human' : 'agent';
  applyAssignee(real, next);
}

async function onConfirmWontfix(reason: string) {
  const pending = pendingWontfix.value;
  wontfixModalOpen.value = false;
  pendingWontfix.value = null;
  if (!pending) return;
  const ok = await applyStatus(pending.issue, 'wontfix', reason);
  if (!ok) return; // status flip failed; load() already reconciled, skip reorder
  if (pending.targetIds && pending.targetIds.length > 0) {
    const archived = pending.issue.archived;
    // Splice the subset (filtered view's wontfix order) into the full
    // wontfix bucket on disk — same reason as in onReorder.
    const fullOrder = issues.value
      .filter((iss) => iss.archived === archived && iss.status === 'wontfix')
      .sort((a, b) => {
        const pa = a.priority ?? Number.POSITIVE_INFINITY;
        const pb = b.priority ?? Number.POSITIVE_INFINITY;
        if (pa !== pb) return pa - pb;
        return a.id.localeCompare(b.id);
      })
      .map((i) => i.id);
    const subsetSet = new Set(pending.targetIds);
    let cursor = 0;
    const fullPayload = fullOrder.map((id) =>
      subsetSet.has(id) ? pending.targetIds![cursor++] : id,
    );
    if (cursor !== pending.targetIds.length) {
      await load();
      return;
    }
    for (let i = 0; i < fullPayload.length; i++) {
      const target = issues.value.find(
        (iss) => iss.id === fullPayload[i] && iss.archived === archived,
      );
      if (target) target.priority = i + 1;
    }
    await applyReorder(archived, 'wontfix', fullPayload);
  }
}

async function onCancelWontfix() {
  wontfixModalOpen.value = false;
  pendingWontfix.value = null;
  // Reset visual state — vuedraggable already moved the card into wontfix
  // optimistically, but the status PATCH never fired. Refetch pulls
  // canonical state and the watch in Column.vue resyncs localIssues.
  await load();
}
</script>

<template>
  <div class="app">
    <div class="sticky-bar" :class="{ scrolled: boardScrolled }">
      <header class="masthead">
        <div class="masthead-meta">
          <template v-if="mode === 'board'">
            <template v-if="hasActiveQuery">
              Vol. 01 — {{ filteredIssues.length }} of
              {{ chipFilteredIssues.length }} match
              <em class="masthead-query">{{ debouncedQuery }}</em>
            </template>
            <template v-else>
              Vol. 01 — {{ allCount() }}
              {{ allCount() === 1 ? 'issue' : 'issues' }}
            </template>
            <button
              v-if="hasNonDefaultFilters"
              type="button"
              class="masthead-clear-filters"
              @click="clearAllFilters"
            >
              Clear filters
            </button>
          </template>
          <template v-else>
            Specs — {{ specs.length }}
            {{ specs.length === 1 ? 'section' : 'sections' }} ·
            {{ specsAggregate.total }}
            {{ specsAggregate.total === 1 ? 'scenario' : 'scenarios' }}
          </template>
        </div>
        <h1 class="masthead-title">Issue <em>Tracker</em></h1>
        <div class="masthead-meta right">
          <div class="mode-toggle" role="tablist" aria-label="Tracker mode">
            <button
              type="button"
              role="tab"
              class="mode-toggle-btn"
              :class="{ active: mode === 'board' }"
              :aria-selected="mode === 'board'"
              @click="mode = 'board'"
            >
              Board
            </button>
            <button
              type="button"
              role="tab"
              class="mode-toggle-btn"
              :class="{ active: mode === 'specs' }"
              :aria-selected="mode === 'specs'"
              @click="mode = 'specs'"
            >
              Specs
            </button>
          </div>
          <input
            v-if="mode === 'board'"
            ref="searchInput"
            v-model="rawQuery"
            type="search"
            class="search-input"
            placeholder="Search ( / )"
            aria-label="Search issues"
            @keydown="onSearchKeydown"
          />
          <div class="shortcut-help">
            <button
              type="button"
              class="shortcut-help-btn"
              :aria-expanded="shortcutHelpOpen"
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts"
              @click="toggleShortcutHelp"
            >
              ?
            </button>
            <div
              v-if="shortcutHelpOpen"
              class="shortcut-help-popover"
              role="dialog"
              aria-label="Keyboard shortcuts"
            >
              <p class="shortcut-help-eyebrow">Shortcuts</p>
              <ul>
                <li><kbd>/</kbd> <span>Focus search</span></li>
                <li>
                  <kbd>Esc</kbd>
                  <span>Clear search · close drawer or modal</span>
                </li>
                <li><kbd>Enter</kbd> <span>Submit Wontfix reason</span></li>
              </ul>
            </div>
          </div>
          <label v-if="mode === 'board'" class="toggle">
            <input v-model="showArchived" type="checkbox" />
            Archive &amp; shipped
          </label>
          <button
            v-if="mode === 'board' && activeProject"
            @click="openProjectDrawer"
          >
            Project doc
          </button>
          <button
            v-if="mode === 'board'"
            type="button"
            class="masthead-backlog-btn"
            :class="{
              'is-empty': backlogCount() === 0,
              active: backlogDrawerOpen,
            }"
            @click="openBacklogDrawer"
          >
            Backlog
            <span class="badge">{{ backlogCount() }}</span>
          </button>
          <button @click="load">Refresh</button>
        </div>
      </header>

      <div v-if="errorMsg" class="banner-error">
        {{ errorMsg }}
        <button style="margin-left: 12px" @click="errorMsg = null">
          Dismiss
        </button>
      </div>

      <template v-if="mode === 'board'">
        <nav class="chips chips-assignee" aria-label="Assignee filter">
          <button
            class="chip"
            :class="{ active: assigneeFilter === 'all' }"
            @click="assigneeFilter = 'all'"
          >
            All
            <span class="badge">{{ assigneeCount('all') }}</span>
          </button>
          <button
            v-for="a in ASSIGNEES"
            :key="a"
            class="chip chip-assignee"
            :class="{ active: assigneeFilter === a, [`assignee-${a}`]: true }"
            @click="assigneeFilter = a"
          >
            <AgentIcon v-if="a === 'agent'" />
            <HumanIcon v-else />
            <span class="chip-assignee-label">{{
              a === 'agent' ? 'Agent' : 'Human'
            }}</span>
            <span class="badge">{{ assigneeCount(a) }}</span>
          </button>
        </nav>

        <nav class="chips" aria-label="Project filter">
          <button
            class="chip"
            :class="{ active: filter === ALL }"
            @click="filter = ALL"
          >
            All
            <span class="badge">{{ allCount() }}</span>
          </button>
          <button
            v-for="p in visibleProjects"
            :key="p.slug"
            class="chip"
            :class="[{ active: filter === p.slug }, toneClass(p.slug)]"
            @click="filter = p.slug"
          >
            {{ p.slug }}
            <span
              v-if="p.status !== 'unknown'"
              class="pstatus"
              :class="p.status"
              >{{ p.status }}</span
            >
            <span class="badge">{{ projectIssueCount(p.slug) }}</span>
          </button>
          <button
            class="chip"
            :class="{ active: filter === STANDALONE }"
            @click="filter = STANDALONE"
          >
            Standalone
            <span class="badge">{{ standaloneCount() }}</span>
          </button>
        </nav>
      </template>
    </div>

    <template v-if="mode === 'board'">
      <main
        v-if="hasActiveQuery && filteredIssues.length === 0"
        class="board board-empty"
        aria-live="polite"
      >
        <div class="search-empty">
          <p class="search-empty-eyebrow">No results</p>
          <h2 class="search-empty-title">
            No issues match <em>{{ debouncedQuery }}</em>
          </h2>
          <button class="search-empty-clear" @click="clearSearch">Clear</button>
        </div>
      </main>
      <main
        v-else
        ref="boardEl"
        class="board"
        :style="boardGridStyle"
        @scroll="onBoardScroll"
      >
        <Column
          v-for="col in visibleColumns"
          :key="col"
          :column-key="col"
          :issues="issuesIn(col)"
          @open="(iss) => (drawerIssue = iss)"
          @drop="onDrop"
          @reorder="onReorder"
          @toggle-assignee="onToggleAssignee"
        />
      </main>
    </template>
    <SpecsView v-else ref="specsViewRef" :specs="specs" />

    <Drawer
      :issue="drawerIssue"
      @close="drawerIssue = null"
      @send-to-backlog="(iss) => applyStatus(iss, 'backlog')"
    />
    <ProjectDrawer
      :project="projectDrawerProject"
      :issues="issues"
      @close="closeProjectDrawer"
      @open-issue="onProjectDrawerOpenIssue"
    />
    <BacklogDrawer
      :open="backlogDrawerOpen"
      :issues="backlogIssues"
      @close="closeBacklogDrawer"
      @open-issue="onBacklogDrawerOpenIssue"
      @promote="onBacklogDrawerPromote"
    />
    <WontfixModal
      :open="wontfixModalOpen"
      :issue-title="pendingWontfix?.issue.title ?? ''"
      @confirm="onConfirmWontfix"
      @cancel="onCancelWontfix"
    />
  </div>
</template>
