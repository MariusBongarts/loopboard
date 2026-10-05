<script setup lang="ts">
import { ref } from 'vue';
import { ArrowUpRight, X } from '@lucide/vue';
import type { Issue } from '../types';
import Avatar from './Avatar.vue';
import LabelPill from './LabelPill.vue';
import StatusIcon from './StatusIcon.vue';

// A project's backlog ideas (#0145, restyled in #0056): promote one to Todo,
// or open it in the issue panel.
const props = defineProps<{
  open: boolean;
  issues: Issue[];
}>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'open-issue' | 'promote', issue: Issue): void;
}>();

// A short "Promoted" note on the row until the refresh removes it.
const promoting = ref<Set<string>>(new Set());

function onPromote(e: MouseEvent, issue: Issue) {
  e.stopPropagation();
  promoting.value.add(issue.id);
  emit('promote', issue);
  setTimeout(() => {
    promoting.value.delete(issue.id);
  }, 1200);
}
</script>

<template>
  <aside v-if="props.open" class="backlog-drawer" role="dialog" aria-label="Backlog">
    <header class="backlog-head">
      <StatusIcon status="backlog" />
      <h2>Backlog</h2>
      <span class="backlog-count">{{ props.issues.length }}</span>
      <span class="backlog-gap" />
      <button type="button" class="ghost icon" title="Close (Esc)" aria-label="Close" @click="emit('close')">
        <X :size="16" aria-hidden="true" />
      </button>
    </header>
    <p class="backlog-sub">Ideas not yet scheduled. Promote one when it's time.</p>
    <p v-if="props.issues.length === 0" class="backlog-empty">No backlog ideas here.</p>
    <ul v-else class="backlog-list">
      <li
        v-for="iss in props.issues"
        :key="iss.id + (iss.archived ? ':a' : '')"
        class="backlog-row"
        :class="{ promoting: promoting.has(iss.id) }"
        @click="emit('open-issue', iss)"
      >
        <span class="card-id">{{ iss.id }}</span>
        <span class="backlog-row-main">
          <span class="backlog-row-title">{{ iss.title }}</span>
          <span v-if="iss.labels.length" class="backlog-row-meta">
            <LabelPill v-for="l in iss.labels" :key="l" :label="l" />
          </span>
        </span>
        <Avatar :assignee="iss.assignee" />
        <button
          v-if="!promoting.has(iss.id)"
          type="button"
          class="backlog-promote"
          title="Promote to Todo"
          aria-label="Promote to Todo"
          @click="(e) => onPromote(e, iss)"
        ><ArrowUpRight :size="14" aria-hidden="true" />Todo</button>
        <span v-else class="backlog-promoted">Promoted</span>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.backlog-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 25;
  display: flex;
  flex-direction: column;
  width: min(520px, calc(100vw - 120px));
  background: var(--bg);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  animation: backlog-in var(--dur-slow) var(--ease);
}
@keyframes backlog-in { from { transform: translateX(24px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .backlog-drawer { animation: none; } }
.backlog-head { display: flex; align-items: center; gap: 8px; height: 48px; padding: 0 10px 0 18px; border-bottom: 1px solid var(--border-subtle); }
.backlog-head h2 { margin: 0; font-size: 15px; font-weight: 600; }
.backlog-count { font-size: 13px; color: var(--text-3); }
.backlog-gap { flex: 1; }
.icon { display: grid; place-items: center; width: 28px; height: 28px; padding: 0; }
.backlog-sub { margin: 0; padding: 10px 18px; font-size: 12.5px; color: var(--text-3); border-bottom: 1px solid var(--border-subtle); }
.backlog-empty { padding: 18px; color: var(--text-3); }
.backlog-list { flex: 1; overflow-y: auto; margin: 0; padding: 0; list-style: none; }
.backlog-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px 10px 18px; border-bottom: 1px solid var(--border-subtle); cursor: pointer; }
.backlog-row:hover { background: var(--bg-hover); }
.backlog-row.promoting { opacity: 0.6; }
.backlog-row-main { flex: 1; display: grid; gap: 4px; min-width: 0; }
.backlog-row-title { overflow: hidden; font-size: 13px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.backlog-row-meta { display: flex; flex-wrap: wrap; gap: 4px; }
.backlog-promote { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; font-size: 12px; }
.backlog-promoted { font-size: 12px; color: var(--green-text); }
</style>
