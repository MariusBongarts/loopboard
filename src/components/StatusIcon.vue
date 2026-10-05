<script setup lang="ts">
import { computed } from 'vue';
import { COLUMN_LABEL, type Status } from '../types';

// Linear-style status glyphs (#0046): shape and color both say the status.
const props = defineProps<{ status: Status; size?: number }>();
const label = computed(() => COLUMN_LABEL[props.status]);
</script>

<template>
  <svg
    class="status-icon"
    :class="`st-${props.status}`"
    :width="props.size ?? 14"
    :height="props.size ?? 14"
    viewBox="0 0 14 14"
    role="img"
    :aria-label="label"
  >
    <title>{{ label }}</title>
    <circle v-if="props.status === 'backlog'" cx="7" cy="7" r="6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="1.6 1.75" />
    <template v-else-if="props.status === 'todo' || props.status === 'in-progress' || props.status === 'in-review'">
      <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path v-if="props.status === 'in-progress'" d="M7 7V3.5a3.5 3.5 0 0 1 0 7Z" fill="currentColor" />
      <path v-else-if="props.status === 'in-review'" d="M7 7V3.5a3.5 3.5 0 1 1-3.5 3.5Z" fill="currentColor" />
    </template>
    <template v-else>
      <circle cx="7" cy="7" r="6.5" fill="currentColor" />
      <path v-if="props.status === 'done'" d="M4.4 7.2 6.2 9l3.4-3.6" fill="none" stroke="var(--on-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path v-else-if="props.status === 'wontfix'" d="M5 5l4 4m0-4-4 4" fill="none" stroke="var(--on-accent)" stroke-width="1.4" stroke-linecap="round" />
      <path v-else d="M4.4 7h5.2" fill="none" stroke="var(--on-accent)" stroke-width="1.6" stroke-linecap="round" />
    </template>
  </svg>
</template>
