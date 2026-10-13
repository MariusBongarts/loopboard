<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useIssueActions } from '../actions';
import { filterIssues, filtersFromQuery, filtersToQuery, groupIssues, type GroupBy, type ListFilters } from '../list';
import { isShortcut, isTyping, overlayOpen } from '../shortcuts';
import { ALL_STATUSES, COLUMN_LABEL, type Status } from '../types';
import { useWorkspace } from '../workspace';
import { CircleDashed, Search, Tag, X } from '@lucide/vue';
import { toneClass } from '../colors';
import { anchorOf, openMenu, type MenuEntry } from '../menu';
import Segmented from './Segmented.vue';
import IssueList from './IssueList.vue';

// Every issue in the workspace as a dense, grouped list (#0031). Filters live
// in the URL; a saved view (#0032) is a named copy of that query.
const route = useRoute();
const router = useRouter();
const { id: workspaceId, issues, projects, views, saveViews } = useWorkspace();
const actions = useIssueActions();

const filters = computed(() => filtersFromQuery(route.query));
const activeViewId = computed(() => (typeof route.query.view === 'string' ? route.query.view : null));
const activeView = computed(() => views.value.find((v) => v.id === activeViewId.value) ?? null);

function update(patch: Partial<ListFilters>) {
  const next = { ...filters.value, ...patch };
  const query: Record<string, string> = filtersToQuery(next);
  if (activeViewId.value) query.view = activeViewId.value;
  void router.replace({ query });
}

function toggleStatus(s: Status) {
  const set = new Set(filters.value.statuses);
  if (set.has(s)) set.delete(s);
  else set.add(s);
  update({ statuses: ALL_STATUSES.filter((x) => set.has(x)) });
}

const labels = computed(() => [...new Set(issues.value.flatMap((i) => i.labels))].sort());
// A saved view can point at a label that no issue carries any more.
const staleLabel = computed(() => !!filters.value.label && !labels.value.includes(filters.value.label));
const projectTitle = (slug: string) => projects.value.find((p) => p.slug === slug)?.title ?? slug;
const shown = computed(() => filterIssues(issues.value, filters.value));
const groups = computed(() => groupIssues(shown.value, filters.value.group, projectTitle));
const flat = computed(() => groups.value.flatMap((g) => g.issues));

const activeId = ref<string | null>(null);
async function move(delta: number) {
  const list = flat.value;
  if (!list.length) return;
  const idx = list.findIndex((i) => i.id === activeId.value);
  const next = list[Math.max(0, Math.min(list.length - 1, idx + delta))];
  activeId.value = next.id;
  await nextTick();
  document.querySelector(`.issue-row[data-issue-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest' });
}

function onKeydown(e: KeyboardEvent) {
  if (isTyping(e) || overlayOpen()) return;
  if (isShortcut(e, 'next')) void move(1);
  else if (isShortcut(e, 'prev')) void move(-1);
  else if (e.key === 'Enter' && activeId.value) {
    const issue = flat.value.find((i) => i.id === activeId.value);
    if (issue) actions.openIssue(issue, flat.value);
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));

// Saved views.
const naming = ref<'new' | 'rename' | null>(null);
const name = ref('');
watch(activeViewId, () => (naming.value = null));

function startNaming(kind: 'new' | 'rename') {
  naming.value = kind;
  name.value = kind === 'rename' ? activeView.value?.name ?? '' : '';
}

async function commitName() {
  const n = name.value.trim();
  if (!n) return;
  const query = filtersToQuery(filters.value);
  if (naming.value === 'rename' && activeView.value) {
    await saveViews(views.value.map((v) => (v.id === activeView.value!.id ? { ...v, name: n, query } : v)));
  } else {
    const id = `v${Date.now().toString(36)}`;
    await saveViews([...views.value, { id, name: n, query }]);
    void router.replace({ query: { ...query, view: id } });
  }
  naming.value = null;
}

async function deleteView() {
  if (!activeView.value) return;
  const id = activeView.value.id;
  await saveViews(views.value.filter((v) => v.id !== id));
  void router.replace({ query: filtersToQuery(filters.value) });
}

// Status and label filters open the shared menu (#0054) instead of a chip row.
function openStatusFilter(e: MouseEvent) {
  openMenu({
    label: 'Filter by status',
    at: anchorOf(e),
    items: () => ALL_STATUSES.map((st) => ({ id: st, label: COLUMN_LABEL[st], status: st, checked: filters.value.statuses.includes(st), keepOpen: true, run: () => toggleStatus(st) })),
  });
}

function openLabelFilter(e: MouseEvent) {
  openMenu({
    label: 'Filter by label',
    at: anchorOf(e),
    filter: 'Label…',
    items: (): MenuEntry[] => [
      { id: 'any', label: 'Any label', checked: !filters.value.label, run: () => update({ label: '' }) },
      'separator',
      ...(staleLabel.value ? [{ id: `stale:${filters.value.label}`, label: `${filters.value.label} (no issues)`, checked: true, run: () => update({ label: '' }) }] : []),
      ...labels.value.map((l) => ({ id: l, label: l, tone: toneClass(l), checked: filters.value.label === l, run: () => update({ label: l }) })),
    ],
  });
}

const filtered = computed(() => filters.value.statuses.length > 0 || !!filters.value.label || !!filters.value.q || filters.value.who !== 'all');
function clearFilters() {
  update({ statuses: [], label: '', q: '', who: 'all' });
}

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'project', label: 'Project' },
  { value: 'label', label: 'Label' },
  { value: 'none', label: 'None' },
];
</script>

<template>
  <section class="list-view" aria-label="Issues">
    <header class="list-view-head">
      <h2>{{ activeView?.name ?? 'Issues' }}</h2>
      <span class="list-view-count">{{ shown.length }}</span>
      <span class="list-view-spacer" />
      <template v-if="naming">
        <input v-model="name" class="list-view-name" aria-label="View name" placeholder="View name" @keydown.enter="commitName" @keydown.esc.stop="naming = null" />
        <button type="button" class="primary" :disabled="!name.trim()" @click="commitName">Save</button>
        <button type="button" @click="naming = null">Cancel</button>
      </template>
      <template v-else>
        <template v-if="activeView">
          <button type="button" @click="startNaming('rename')">Rename / update</button>
          <button type="button" class="danger" @click="deleteView">Delete view</button>
        </template>
        <button type="button" @click="startNaming('new')">Save view</button>
      </template>
    </header>
    <div class="view-tools">
      <Segmented :model-value="filters.group" label="Group by" :options="GROUP_OPTIONS" @update:model-value="(g) => update({ group: g })" />
      <Segmented
        :model-value="filters.who"
        label="Assignee"
        :options="[
          { value: 'all', label: 'Everyone' },
          { value: 'human', label: 'You' },
          { value: 'agent', label: 'Agent' },
        ]"
        @update:model-value="(w) => update({ who: w })"
      />
      <button type="button" class="view-filter" :class="{ on: filters.statuses.length }" aria-label="Filter by status" @click="openStatusFilter">
        <CircleDashed :size="14" aria-hidden="true" />Status<span v-if="filters.statuses.length" class="view-filter-n">{{ filters.statuses.length }}</span>
      </button>
      <button type="button" class="view-filter" :class="{ on: filters.label, stale: staleLabel }" aria-label="Filter by label" @click="openLabelFilter">
        <Tag :size="14" aria-hidden="true" />{{ filters.label || 'Label' }}
      </button>
      <label class="view-search">
        <Search :size="14" aria-hidden="true" />
        <input :value="filters.q" type="search" placeholder="Filter" aria-label="Filter issues" @input="(e) => update({ q: (e.target as HTMLInputElement).value })" />
      </label>
      <button v-if="filtered" type="button" class="ghost view-clear" @click="clearFilters"><X :size="14" aria-hidden="true" />Clear</button>
    </div>
    <IssueList :groups="groups" :active-id="activeId" :show-project="filters.group !== 'project'" :group-by="filters.group" @open="(i) => { activeId = i.id; actions.openIssue(i, flat); }" />
    <p class="list-view-foot">{{ workspaceId }} · <kbd>j</kbd>/<kbd>k</kbd> to move, <kbd>Enter</kbd> to open, right-click a row for more</p>
  </section>
</template>

<style scoped>
.list-view { display: flex; flex-direction: column; min-height: 0; height: 100%; }
.list-view-head { display: flex; align-items: center; gap: 8px; height: 52px; padding: 0 20px; border-bottom: 1px solid var(--border-subtle); flex: 0 0 auto; }
.list-view-head h2 { margin: 0; font-size: 15px; font-weight: 600; }
.list-view-count { font-size: 13px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.list-view-head button { padding: 4px 10px; font-size: 12.5px; }
.list-view-spacer { flex: 1; }
.list-view-name { width: 220px; height: 30px; }
.list-view > :deep(.issue-list) { flex: 1; min-height: 0; overflow-y: auto; }
.list-view-foot { flex: 0 0 auto; margin: 0; padding: 8px 20px; border-top: 1px solid var(--border-subtle); font-size: 12px; color: var(--text-4); }
</style>
