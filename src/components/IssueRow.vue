<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import type { Assignee, Status } from '../types';
import Avatar from './Avatar.vue';
import LabelPill from './LabelPill.vue';
import ProjectBadge from './ProjectBadge.vue';
import StatusIcon from './StatusIcon.vue';

// One dense issue row (#0054) — the list view, a project's list layout and
// Needs you all use it. A button, or a link when `to` is given.
export interface RowIssue {
  id: string;
  title: string;
  status: Status;
  assignee: Assignee;
  labels?: string[];
  project?: string;
  created?: string;
}

const props = defineProps<{ issue: RowIssue; active?: boolean; showProject?: boolean; to?: RouteLocationRaw }>();
</script>

<template>
  <component
    :is="props.to ? RouterLink : 'button'"
    :type="props.to ? undefined : 'button'"
    :to="props.to"
    class="issue-row"
    :class="{ on: props.active }"
    :data-issue-id="props.issue.id"
  >
    <span class="card-id issue-row-id">{{ props.issue.id }}</span>
    <StatusIcon :status="props.issue.status" />
    <span class="issue-row-title">{{ props.issue.title }}</span>
    <span v-if="props.issue.labels?.length" class="issue-row-labels">
      <LabelPill v-for="l in props.issue.labels" :key="l" :label="l" />
    </span>
    <ProjectBadge v-if="props.showProject && props.issue.project" :slug="props.issue.project" class="issue-row-project" />
    <Avatar :assignee="props.issue.assignee" />
    <span v-if="props.issue.created !== undefined" class="issue-row-date">{{ props.issue.created }}</span>
  </component>
</template>

<style scoped>
.issue-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 38px;
  padding: 0 16px;
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  font-weight: 400;
  text-align: left;
  text-decoration: none;
}
.issue-row:hover { background: var(--bg-hover); }
.issue-row.on { background: var(--bg-active); }
.issue-row-id { flex: 0 0 40px; }
.issue-row-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.issue-row-labels { display: flex; gap: 4px; min-width: 0; overflow: hidden; }
.issue-row-project { flex: 0 1 auto; max-width: 180px; }
.issue-row-date { flex: 0 0 auto; min-width: 72px; text-align: right; font-size: 12px; color: var(--text-3); font-variant-numeric: tabular-nums; white-space: nowrap; }
</style>
