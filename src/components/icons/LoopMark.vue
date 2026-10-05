<script setup lang="ts">
// The loop mark (#0045): the favicon's arrow on an accent tile.
defineProps<{ size?: number }>();
</script>

<template>
  <svg class="loop-mark" :width="size ?? 20" :height="size ?? 20" viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="var(--accent)" />
    <path d="M22.5 11.2A8 8 0 1 0 24 16" fill="none" stroke="var(--on-accent)" stroke-width="3" stroke-linecap="round" />
    <path d="M19.4 9.6l3.9 1.5-1.5 3.9" fill="none" stroke="var(--on-accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
