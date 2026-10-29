<script setup lang="ts">
import type { Issue } from '../../types';
import StatusIcon from '../StatusIcon.vue';
import PeekLink from './PeekLink.vue';

// An issue as a small chip (#0128): dashed when the run only mentioned it.
const props = defineProps<{ issue: Issue; mention?: boolean }>();
</script>

<template>
  <PeekLink class="issue-chip" :class="{ mention: props.mention }" :to="{ kind: 'issue', id: props.issue.id }">
    <StatusIcon :status="props.issue.status" :size="12" />
    <span class="issue-chip-id">#{{ props.issue.id }}</span>
    <span class="issue-chip-title">{{ props.issue.title }}</span>
  </PeekLink>
</template>

<style scoped>
.issue-chip { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; height: 24px; padding: 0 8px 0 6px; border: 1px solid var(--border); border-radius: var(--r); background: var(--surface); font-size: 12px; color: var(--text-2); text-decoration: none; transition: border-color var(--dur) var(--ease), background var(--dur) var(--ease); }
.issue-chip:hover { border-color: var(--border-strong); background: var(--bg-hover); color: var(--text); }
.issue-chip.mention { border-style: dashed; }
.issue-chip-id { font: 500 11px var(--mono); color: var(--text-3); }
.issue-chip-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px; }
</style>
