<script setup lang="ts">
import type { HealthTone } from '../../home';

// A run's or a routine's state as a dot, in the run tokens (#0120).
defineProps<{ tone: HealthTone }>();
</script>

<template>
  <span class="run-dot" :class="tone" aria-hidden="true" />
</template>

<style scoped>
.run-dot { flex: none; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--run-missed); }
.run-dot.ok { background: var(--run-ok); }
.run-dot.failed { background: var(--run-failed); }
.run-dot.running { background: var(--run-running); animation: run-pulse 1.6s var(--ease) infinite; }
.run-dot.paused, .run-dot.none { background: transparent; box-shadow: inset 0 0 0 1.5px var(--text-4); }
@keyframes run-pulse { 50% { opacity: 0.35; } }
@media (prefers-reduced-motion: reduce) { .run-dot.running { animation: none; } }
</style>
