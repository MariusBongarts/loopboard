<script setup lang="ts">
import { ref, watch } from 'vue';

// Collapsed state is remembered per strip across projects and reloads.
const props = defineProps<{ storageKey: string; label?: string }>();

function read(): boolean {
  try {
    return localStorage.getItem(props.storageKey) === '1';
  } catch {
    return false;
  }
}

const collapsed = ref(read());
watch(collapsed, (v) => {
  try {
    localStorage.setItem(props.storageKey, v ? '1' : '0');
  } catch {
    /* ignore */
  }
});

// While collapsed, the whole strip is the expand target — the one-line
// preview must not trigger the links or buttons it contains.
function onBodyClick(e: MouseEvent) {
  if (!collapsed.value) return;
  e.preventDefault();
  e.stopPropagation();
  collapsed.value = false;
}
</script>

<template>
  <div class="strip" :class="{ collapsed }">
    <button
      type="button"
      class="strip-toggle"
      :aria-expanded="!collapsed"
      :title="collapsed ? 'Expand' : 'Collapse'"
      @click="collapsed = !collapsed"
    >
      <span class="strip-chevron" aria-hidden="true" />
      <span v-if="props.label" class="strip-label">{{ props.label }}</span>
    </button>
    <div class="strip-body" @click.capture="onBodyClick"><slot :collapsed="collapsed" /></div>
  </div>
</template>
