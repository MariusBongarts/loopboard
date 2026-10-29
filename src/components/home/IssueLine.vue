<script setup lang="ts">
import type { Issue } from '../../types';
import StatusIcon from '../StatusIcon.vue';
import PeekLink from './PeekLink.vue';

// One issue as a row: status, id, title, then whatever the caller adds.
const props = defineProps<{ issue: Issue }>();
</script>

<template>
  <PeekLink class="issue-line" :to="{ kind: 'issue', id: props.issue.id }">
    <StatusIcon :status="props.issue.status" />
    <span class="issue-line-id">#{{ props.issue.id }}</span>
    <span class="issue-line-title">{{ props.issue.title }}</span>
    <span v-if="$slots.default" class="issue-line-aside"><slot /></span>
  </PeekLink>
</template>

<style scoped>
.issue-line { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 5px 8px; margin: 0 -8px; border-radius: var(--r); color: var(--text); text-decoration: none; }
.issue-line:hover { background: var(--bg-hover); }
.issue-line-id { flex: none; font: 500 11.5px var(--mono); color: var(--text-3); }
.issue-line-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.issue-line-aside { flex: none; display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-4); }
</style>
