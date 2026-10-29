<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useWorkspace } from '../../workspace';
import Avatar from '../Avatar.vue';
import ProjectBadge from '../ProjectBadge.vue';
import StatusIcon from '../StatusIcon.vue';
import { COLUMN_LABEL } from '../../types';
import { clip } from '../../home';

// Hovering an issue link on Home shows a small card (#0132): status, title,
// project and the start of its description. Never on touch.
const props = defineProps<{ within: HTMLElement | null }>();
const { issues } = useWorkspace();
const shown = ref<{ id: string; left: number; top: number; below: boolean } | null>(null);
const card = ref<HTMLElement | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

const issue = computed(() => (shown.value ? issues.value.find((i) => i.id === shown.value!.id && !i.archived) ?? null : null));
const excerpt = computed(() =>
  issue.value ? clip(issue.value.body.replace(/^#+.*$/gm, '').replace(/[*_`>#[\]]/g, '').replace(/\s+/g, ' ').trim(), 220) : '',
);

function target(e: Event): HTMLElement | null {
  const el = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-issue]') : null;
  return el && (props.within?.contains(el) || el.closest('.modal-preview')) ? el : null;
}

function onOver(e: PointerEvent) {
  if (e.pointerType === 'touch') return;
  const el = target(e);
  if (!el) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!el.isConnected) return;
    const r = el.getBoundingClientRect();
    const below = r.bottom + 150 < window.innerHeight;
    shown.value = { id: el.dataset.issue ?? '', left: Math.max(8, Math.min(r.left, window.innerWidth - 336)), top: below ? r.bottom + 6 : r.top - 6, below };
  }, 350);
}

function onOut(e: PointerEvent) {
  const el = target(e);
  // Moving between the link's own children isn't leaving it.
  if (!el || (e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) return;
  clearTimeout(timer);
  shown.value = null;
}

function hide() {
  clearTimeout(timer);
  shown.value = null;
}

onMounted(() => {
  document.addEventListener('pointerover', onOver);
  document.addEventListener('pointerout', onOut);
  document.addEventListener('pointerdown', hide);
  window.addEventListener('scroll', hide, true);
});
onBeforeUnmount(() => {
  clearTimeout(timer);
  document.removeEventListener('pointerover', onOver);
  document.removeEventListener('pointerout', onOut);
  document.removeEventListener('pointerdown', hide);
  window.removeEventListener('scroll', hide, true);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="shown && issue"
      ref="card"
      class="hover-card"
      role="tooltip"
      :style="{ left: `${shown.left}px`, top: `${shown.top}px`, transform: shown.below ? undefined : 'translateY(-100%)' }"
    >
      <div class="hover-meta">
        <StatusIcon :status="issue.status" />
        <span class="hover-id">#{{ issue.id }}</span>
        <span>{{ COLUMN_LABEL[issue.status] }}</span>
        <Avatar :assignee="issue.assignee" />
        <ProjectBadge v-if="issue.project" :slug="issue.project" />
      </div>
      <p class="hover-title">{{ issue.title }}</p>
      <p v-if="excerpt" class="hover-body">{{ excerpt }}</p>
    </div>
  </Teleport>
</template>

<style scoped>
.hover-card { position: fixed; z-index: 60; width: 320px; padding: 10px 12px; background: var(--surface-raised); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow-lg); pointer-events: none; animation: hover-in var(--dur) var(--ease); }
@keyframes hover-in { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .hover-card { animation: none; } }
.hover-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 11.5px; color: var(--text-3); }
.hover-id { font-family: var(--mono); }
.hover-title { margin: 6px 0 0; font-weight: 600; line-height: 1.35; }
.hover-body { margin: 6px 0 0; font-size: 12px; line-height: 1.5; color: var(--text-3); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
</style>
