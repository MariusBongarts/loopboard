<script setup lang="ts">
import type { HealthRow, Home } from '../../home';
import { dayLabel } from '../../inbox';
import { nextSlotText, routineWhen } from '../../routines';
import ProjectBadge from '../ProjectBadge.vue';
import IssueLine from './IssueLine.vue';
import PeekLink from './PeekLink.vue';
import RunDot from './RunDot.vue';
import RunStrip from './RunStrip.vue';

// Beside the timeline (#0129): every routine's health, what needs you and
// the projects worked on last.
const props = defineProps<{ home: Home; today: string; now: number; workspace: string }>();
const NEEDS_SHOWN = 5;

// "Next today 08:00", or what keeps it from having one.
function nextLine(h: HealthRow): string {
  if (h.tone === 'paused') return 'Paused';
  const next = nextSlotText(h.routine, props.now);
  if (next === '—') return 'No next slot';
  return h.routine.state === 'due' || h.routine.state === 'running' ? next : `Next ${next}`;
}
</script>

<template>
  <aside class="home-side">
    <section class="side-card" aria-label="Routine health">
      <h3>Autopilot <RouterLink class="side-all" :to="`/w/${props.workspace}/routines`">All →</RouterLink></h3>
      <p v-if="!props.home.health.length" class="side-empty">No routines yet.</p>
      <div v-for="h in props.home.health" :key="h.routine.slug" class="health-row">
        <RunDot :tone="h.tone" :title="h.label || undefined" />
        <PeekLink class="health-name" :to="{ kind: 'routine', slug: h.routine.slug }">{{ h.routine.title }}</PeekLink>
        <RunStrip :routine="h.routine" :runs="h.strip" />
        <span class="health-meta">
          <span>{{ nextLine(h) }}</span>
          <span v-if="h.last">Last {{ routineWhen(h.last.at, h.routine, props.now) }}</span>
          <span v-else>{{ h.label }}</span>
        </span>
      </div>
    </section>

    <section class="side-card" aria-label="Needs you">
      <h3>
        Needs you · {{ props.home.needsYou.length }}
        <RouterLink v-if="props.home.needsYou.length > NEEDS_SHOWN" class="side-all" to="/needs-you">All →</RouterLink>
      </h3>
      <p v-if="!props.home.needsYou.length" class="side-empty">Nothing waits on you.</p>
      <IssueLine v-for="i in props.home.needsYou.slice(0, NEEDS_SHOWN)" :key="i.id" :issue="i" />
    </section>

    <section v-if="props.home.projects.length" class="side-card" aria-label="Projects">
      <h3>Projects <RouterLink class="side-all" :to="`/w/${props.workspace}/projects`">All →</RouterLink></h3>
      <PeekLink v-for="p in props.home.projects" :key="p.slug" class="side-project" :to="{ kind: 'project', slug: p.slug }">
        <ProjectBadge :slug="p.slug" />
        <span class="side-when">{{ p.lastSession ? dayLabel(p.lastSession, props.today) : '' }}</span>
      </PeekLink>
    </section>
  </aside>
</template>

<style scoped>
.home-side { display: grid; gap: 14px; align-content: start; min-width: 0; }
.side-card { min-width: 0; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--r-lg); background: var(--surface); }
.side-card h3 { display: flex; margin: 0 0 8px; font-size: 11px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; }
.side-all { margin-left: auto; font-size: 12px; font-weight: 500; color: var(--text-3); text-transform: none; letter-spacing: 0; text-decoration: none; }
.side-all:hover { color: var(--accent-text); }
.side-empty { margin: 0; font-size: 12.5px; color: var(--text-4); }
.health-row { display: grid; grid-template-columns: 8px minmax(0, 1fr) auto; align-items: center; gap: 2px 10px; padding: 6px 0; }
.health-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; color: var(--text); text-decoration: none; }
.health-name:hover { color: var(--accent-text); }
.health-meta { grid-column: 2 / 4; display: flex; justify-content: space-between; gap: 8px; font-size: 11.5px; color: var(--text-4); }
.home-side :deep(.issue-line .issue-line-id) { width: auto; }
.side-project { display: flex; align-items: center; gap: 8px; padding: 6px 8px; margin: 0 -8px; border-radius: var(--r); color: var(--text); text-decoration: none; min-width: 0; }
.side-project:hover { background: var(--bg-hover); }
.side-project :deep(.project-badge) { flex: 1; min-width: 0; color: var(--text); }
.side-when { flex: none; font-size: 11.5px; color: var(--text-4); }
</style>
