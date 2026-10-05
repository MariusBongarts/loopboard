<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useIssueActions } from '../actions';
import { filterIssues, filtersFromQuery, filtersToQuery, groupIssues, type GroupBy, type ListFilters } from '../list';
import { isShortcut, isTyping } from '../shortcuts';
import { ALL_STATUSES, COLUMN_LABEL, type Status } from '../types';
import { useWorkspace } from '../workspace';
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
  if (isTyping(e) || document.querySelector('.drawer, .modal-backdrop')) return;
  if (isShortcut(e, 'next')) void move(1);
  else if (isShortcut(e, 'prev')) void move(-1);
  else if (e.key === 'Enter' && activeId.value) {
    const issue = flat.value.find((i) => i.id === activeId.value);
    if (issue) actions.openIssue(issue);
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
      <span class="projects-count">{{ shown.length }}</span>
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
    <div class="list-view-tools">
      <label class="list-view-tool"><span>Group</span>
        <Segmented :model-value="filters.group" label="Group by" :options="GROUP_OPTIONS" @update:model-value="(g) => update({ group: g })" />
      </label>
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
      <div class="list-view-statuses" role="group" aria-label="Status">
        <button
          v-for="s in ALL_STATUSES"
          :key="s"
          type="button"
          class="fchip"
          :class="{ on: filters.statuses.includes(s) }"
          :aria-pressed="filters.statuses.includes(s)"
          @click="toggleStatus(s)"
        >{{ COLUMN_LABEL[s] }}</button>
      </div>
      <select :value="filters.label" aria-label="Label" class="list-view-label" :class="{ stale: staleLabel }" @change="(e) => update({ label: (e.target as HTMLSelectElement).value })">
        <option value="">Any label</option>
        <option v-if="staleLabel" :value="filters.label">{{ filters.label }} (no issues)</option>
        <option v-for="l in labels" :key="l" :value="l">{{ l }}</option>
      </select>
      <input :value="filters.q" type="search" class="pane-search" placeholder="Filter" aria-label="Filter issues" @input="(e) => update({ q: (e.target as HTMLInputElement).value })" />
    </div>
    <IssueList :groups="groups" :active-id="activeId" :show-project="filters.group !== 'project'" @open="(i) => { activeId = i.id; actions.openIssue(i); }" />
    <p class="list-view-foot">{{ workspaceId }} · <kbd>j</kbd>/<kbd>k</kbd> to move, <kbd>Enter</kbd> to open</p>
  </section>
</template>
