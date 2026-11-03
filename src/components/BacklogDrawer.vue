<script setup lang="ts">
import { X } from '@lucide/vue';
import type { Issue } from '../types';
import BacklogRow from './BacklogRow.vue';
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
      <BacklogRow
        v-for="iss in props.issues"
        :key="iss.id + (iss.archived ? ':a' : '')"
        :issue="iss"
        @open="emit('open-issue', iss)"
        @promote="emit('promote', iss)"
      />
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
</style>
