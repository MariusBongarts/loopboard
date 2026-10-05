<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { ChevronDown, ChevronUp, Maximize2, X } from '@lucide/vue';
import { useResizable } from '../resize';
import { hasModifier, isShortcut, isTyping, overlayOpen } from '../shortcuts';
import type { Issue } from '../types';
import IssueView from './IssueView.vue';
import ResizeHandle from './ResizeHandle.vue';

// The issue side panel (#0050): resizable, steps through the list it was
// opened from, expands into the full page (#0051). No backdrop — the board
// stays usable next to it.
const props = defineProps<{ issue: Issue; position: number; total: number }>();
const emit = defineEmits<{ (e: 'close' | 'expand' | 'prev' | 'next'): void }>();

const resizer = useResizable({ key: 'loopboard.panelWidth', min: 420, max: 1200, initial: 620, edge: 'left' });

function onKeydown(e: KeyboardEvent) {
  if (isTyping(e) || hasModifier(e) || overlayOpen({ ignorePanel: true })) return;
  if (isShortcut(e, 'next')) {
    e.preventDefault();
    emit('next');
  } else if (isShortcut(e, 'prev')) {
    e.preventDefault();
    emit('prev');
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <aside class="issue-panel" role="dialog" aria-label="Issue detail" :style="{ width: `${resizer.size.value}px` }">
    <ResizeHandle class="issue-panel-resizer" :resizer="resizer" label="Resize issue panel" />
    <header class="issue-panel-bar">
      <template v-if="props.total > 1">
        <button type="button" class="ghost icon" title="Previous (k)" aria-label="Previous issue" :disabled="props.position <= 1" @click="emit('prev')">
          <ChevronUp :size="16" aria-hidden="true" />
        </button>
        <button type="button" class="ghost icon" title="Next (j)" aria-label="Next issue" :disabled="props.position >= props.total" @click="emit('next')">
          <ChevronDown :size="16" aria-hidden="true" />
        </button>
        <span class="issue-panel-pos">{{ props.position }} / {{ props.total }}</span>
      </template>
      <span class="issue-panel-gap" />
      <button type="button" class="ghost icon" title="Open as page" aria-label="Open as page" @click="emit('expand')">
        <Maximize2 :size="15" aria-hidden="true" />
      </button>
      <button type="button" class="ghost icon" title="Close (Esc)" aria-label="Close" @click="emit('close')">
        <X :size="16" aria-hidden="true" />
      </button>
    </header>
    <div class="issue-panel-scroll">
      <IssueView :issue="props.issue" layout="panel" />
    </div>
  </aside>
</template>

<style scoped>
.issue-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  max-width: calc(100vw - 120px);
  background: var(--bg);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  animation: panel-in var(--dur-slow) var(--ease);
}
@keyframes panel-in { from { transform: translateX(24px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .issue-panel { animation: none; } }
.issue-panel-resizer { left: -4px; }
.issue-panel-bar { display: flex; align-items: center; gap: 2px; height: 44px; padding: 0 10px; border-bottom: 1px solid var(--border-subtle); }
.issue-panel-pos { margin-left: 6px; font-size: 12px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.issue-panel-gap { flex: 1; }
.icon { display: grid; place-items: center; width: 28px; height: 28px; padding: 0; }
.issue-panel-scroll { flex: 1; overflow-y: auto; padding: 18px 24px 40px; }
</style>
