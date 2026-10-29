<script setup lang="ts">
import { RUN_LABEL, runTone } from '../../routines';
import type { RunStatus } from '../../types';

// A run's status in words, toned like its dot (#0127).
const props = defineProps<{ status: RunStatus }>();
</script>

<template>
  <span class="run-tag" :class="runTone(props.status)">{{ RUN_LABEL[props.status] }}</span>
</template>

<style scoped>
.run-tag { display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: var(--r-sm); font-size: 11px; font-weight: 600; white-space: nowrap; color: var(--text-3); background: var(--bg-active); }
.run-tag.ok { color: var(--green-text); background: var(--green-soft); }
.run-tag.failed { color: var(--red-text); background: var(--red-soft); }
.run-tag.running { color: var(--amber-text); background: var(--amber-soft); }
</style>
