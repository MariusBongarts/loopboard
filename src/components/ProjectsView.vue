<script setup lang="ts">
import { computed } from 'vue';
import { toneClass } from '../colors';
import { prdNumber, relativeDay, todayIso } from '../inbox';
import { projectProgress } from '../projects';
import type { Issue, Project } from '../types';

// Every project at a glance (#0029): progress overall and per phase.
const props = defineProps<{ projects: Project[]; issues: Issue[] }>();
const emit = defineEmits<{ (e: 'open', slug: string): void }>();
const today = todayIso();

const GROUPS = [
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'shipped', label: 'Shipped' },
] as const;

const rows = computed(() =>
  props.projects.map((p) => ({ project: p, progress: projectProgress(p, props.issues) })),
);
const groups = computed(() =>
  GROUPS.map((g) => ({
    ...g,
    rows: rows.value
      .filter((r) => (g.key === 'active' ? !['paused', 'shipped'].includes(r.project.status) : r.project.status === g.key))
      .sort((a, b) => (b.project.lastSession ?? '').localeCompare(a.project.lastSession ?? '')),
  })).filter((g) => g.rows.length),
);

function pct(closed: number, total: number): number {
  return total ? Math.round((closed / total) * 100) : 0;
}
</script>

<template>
  <section class="projects-view" aria-label="Projects">
    <header class="projects-head">
      <h2>Projects</h2>
      <span class="projects-count">{{ props.projects.length }}</span>
    </header>
    <p v-if="!props.projects.length" class="list-empty">No projects yet. Ask your agent to "write a PRD for …", or use + in the rail.</p>
    <section v-for="g in groups" :key="g.key" class="projects-group">
      <h3>{{ g.label }}</h3>
      <button
        v-for="{ project: p, progress } in g.rows"
        :key="p.slug"
        type="button"
        class="project-row"
        @click="emit('open', p.slug)"
      >
        <span class="project-row-main">
          <span class="project-row-title">
            <span class="rail-dot" :class="toneClass(p.slug)" />
            <span class="prd-num">{{ prdNumber(p.slug) }}</span>
            {{ p.title }}
          </span>
          <span class="project-row-meta">
            <template v-if="p.lastSession">last session {{ relativeDay(p.lastSession, today) }}</template>
            <span v-if="progress.needsYou" class="project-row-you">{{ progress.needsYou }} need you</span>
          </span>
        </span>
        <span class="project-row-progress">
          <span class="bar" :title="`${progress.closed} of ${progress.total} closed`">
            <span class="bar-fill" :style="{ width: `${pct(progress.closed, progress.total)}%` }" />
          </span>
          <span class="project-row-pct">{{ progress.closed }}/{{ progress.total }}</span>
        </span>
        <span v-if="progress.phases.length" class="project-phases">
          <span v-for="ph in progress.phases" :key="ph.name" class="project-phase" :title="`${ph.name}: ${ph.closed}/${ph.total}`">
            <span class="project-phase-name">{{ ph.name }}</span>
            <span class="bar bar-thin"><span class="bar-fill" :style="{ width: `${pct(ph.closed, ph.total)}%` }" /></span>
          </span>
        </span>
      </button>
    </section>
  </section>
</template>
