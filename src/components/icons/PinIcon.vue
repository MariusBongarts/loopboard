<script setup lang="ts">
defineProps<{ filled?: boolean }>();
</script>

<template>
  <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">
    <path
      d="M6.1 1.7h3.8l-.4 3.1 2.2 1.15v1.45H4.3V5.95l2.2-1.15z"
      :fill="filled ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="1.2"
      stroke-linejoin="round"
    />
    <path d="M8 7.5v6.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
  </svg>
</template>
