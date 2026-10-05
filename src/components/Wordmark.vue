<script setup lang="ts">
import LoopMark from './icons/LoopMark.vue';

// The loopboard wordmark (#0045): the loop mark + "loopboard" in the UI font.
defineProps<{ size?: number }>();
</script>

<template>
  <span class="wordmark" aria-label="loopboard">
    <LoopMark :size="size ?? 20" />
    <span aria-hidden="true">loopboard</span>
  </span>
</template>

<style scoped>
.wordmark { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; letter-spacing: -0.015em; color: var(--text); }
</style>
