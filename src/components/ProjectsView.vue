<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowUpDown, Search, X } from '@lucide/vue';
import { toneClass } from '../colors';
import { prdNumber, relativeDay, searchProjects, todayIso } from '../inbox';
import { anchorOf, openMenu } from '../menu';
import { parseProjectSort, percent, PROJECT_SORTS, projectProgress, sortProjectRows, type ProjectSort } from '../projects';
import { readStored, writeStored } from '../storage';
import { tokenizeQuery, type Issue, type Project } from '../types';

// Every project at a glance (#0029): progress overall and per phase.
// Filtered by `?q=` and sorted by a remembered choice (#0069).
const props = defineProps<{ projects: Project[]; issues: Issue[] }>();
const emit = defineEmits<{ (e: 'open', slug: string): void }>();
const today = todayIso();
const route = useRoute();
const router = useRouter();

const GROUPS = [
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'shipped', label: 'Shipped' },
] as const;

const SORT_KEY = 'loopboard.projects.sort';
const sort = ref<ProjectSort>(parseProjectSort(readStored(SORT_KEY)));
const sortLabel = computed(() => PROJECT_SORTS.find((s) => s.value === sort.value)!.label);
function setSort(s: ProjectSort) {
  sort.value = s;
  writeStored(SORT_KEY, s);
}
function openSort(e: MouseEvent) {
  openMenu({
    label: 'Sort projects',
    at: anchorOf(e),
    items: () => PROJECT_SORTS.map((s) => ({ id: s.value, label: s.label, checked: sort.value === s.value, run: () => setSort(s.value) })),
  });
}

const q = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''));
function setQuery(value: string) {
  void router.replace({ query: value ? { ...route.query, q: value } : { ...route.query, q: undefined } });
}

const shown = computed(() => searchProjects(props.projects, tokenizeQuery(q.value)));
const rows = computed(() => sortProjectRows(shown.value.map((p) => ({ project: p, progress: projectProgress(p, props.issues) })), sort.value));
const groups = computed(() =>
  GROUPS.map((g) => ({
    ...g,
    rows: rows.value.filter((r) => (g.key === 'active' ? !['paused', 'shipped'].includes(r.project.status) : r.project.status === g.key)),
  })).filter((g) => g.rows.length),
);
</script>

<template>
  <section class="projects-view" aria-label="Projects">
    <header class="projects-head">
      <h2>Projects</h2>
      <span class="projects-count">{{ shown.length }}</span>
    </header>
    <div v-if="props.projects.length" class="view-tools">
      <label class="view-search">
        <Search :size="14" aria-hidden="true" />
        <input :value="q" type="search" placeholder="Filter projects" aria-label="Filter projects" @input="(e) => setQuery((e.target as HTMLInputElement).value)" />
      </label>
      <button v-if="q" type="button" class="ghost view-clear" @click="setQuery('')"><X :size="14" aria-hidden="true" />Clear</button>
      <span class="projects-spacer" />
      <button type="button" class="view-filter" aria-label="Sort projects" :title="`Sort: ${sortLabel}`" @click="openSort">
        <ArrowUpDown :size="14" aria-hidden="true" />{{ sortLabel }}
      </button>
    </div>
    <div class="projects-scroll">
      <p v-if="!props.projects.length" class="list-empty">No projects yet. Ask your agent to "write a PRD for …", or use + in the rail.</p>
      <p v-else-if="!shown.length" class="list-empty">No projects match “{{ q }}”.</p>
      <section v-for="g in groups" :key="g.key" class="projects-group">
        <h3 class="projects-group-head">{{ g.label }} <span>{{ g.rows.length }}</span></h3>
        <button
          v-for="{ project: p, progress } in g.rows"
          :key="p.slug"
          type="button"
          class="project-row"
          @click="emit('open', p.slug)"
        >
          <span class="project-row-main">
            <span class="project-row-title">
              <span class="project-mark" :class="toneClass(p.slug)" aria-hidden="true" />
              {{ p.title }}
              <span class="prd-num">{{ prdNumber(p.slug) }}</span>
            </span>
            <span v-if="progress.phases.length" class="project-phases">
              <span v-for="ph in progress.phases" :key="ph.name" class="project-phase" :title="`${ph.name}: ${ph.closed}/${ph.total} closed`">
                <span class="project-phase-name">{{ ph.name }}</span>
                <span class="bar bar-thin"><span class="bar-fill" :style="{ width: `${percent(ph.closed, ph.total)}%` }" /></span>
              </span>
            </span>
          </span>
          <span class="project-row-progress">
            <span class="bar" :title="`${progress.closed} of ${progress.total} closed`">
              <span class="bar-fill" :style="{ width: `${percent(progress.closed, progress.total)}%` }" />
            </span>
            <span class="project-row-pct">{{ progress.closed }}/{{ progress.total }}</span>
          </span>
          <span class="project-row-cell">
            <span v-if="progress.needsYou" class="project-row-you">{{ progress.needsYou }} need you</span>
          </span>
          <span class="project-row-cell project-row-when">{{ p.lastSession ? relativeDay(p.lastSession, today) : '—' }}</span>
        </button>
      </section>
    </div>
  </section>
</template>

<style scoped>
.projects-view { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.projects-head { display: flex; align-items: center; gap: 8px; height: 52px; padding: 0 20px; border-bottom: 1px solid var(--border-subtle); flex: 0 0 auto; }
.projects-head h2 { margin: 0; font-size: 15px; font-weight: 600; }
.projects-count { font-size: 13px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.projects-spacer { flex: 1; }
.projects-scroll { flex: 1; overflow-y: auto; padding-bottom: 40px; }
.projects-group-head { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 8px; height: 36px; margin: 0; padding: 0 20px; border-bottom: 1px solid var(--border-subtle); background: var(--bg-subtle); font-size: 13px; font-weight: 500; }
.projects-group-head span { color: var(--text-3); font-weight: 400; }
.project-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 200px 110px 90px;
  align-items: center;
  gap: 20px;
  width: 100%;
  padding: 12px 20px;
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  background: transparent;
  font-weight: 400;
  text-align: left;
}
.project-row:hover { background: var(--bg-hover); }
.project-row-main { display: grid; gap: 8px; min-width: 0; }
.project-row-title { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 500; color: var(--text); }
.project-mark { width: 12px; height: 12px; border-radius: 3px; background: var(--tone); flex: 0 0 auto; }
.project-phases { display: flex; flex-wrap: wrap; gap: 6px 16px; }
.project-phase { display: grid; gap: 4px; width: 140px; min-width: 0; }
.project-phase-name { font-size: 11.5px; color: var(--text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.project-row-progress { display: flex; align-items: center; gap: 10px; }
.project-row-pct { min-width: 40px; font-size: 12px; color: var(--text-2); text-align: right; font-variant-numeric: tabular-nums; }
.project-row-cell { font-size: 12px; color: var(--text-3); }
.project-row-you { display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-text); font-weight: 500; }
.project-row-when { text-align: right; }
.bar { flex: 1; height: 6px; border-radius: 999px; background: var(--bg-active); overflow: hidden; }
.bar-thin { height: 3px; }
.bar-fill { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
</style>
