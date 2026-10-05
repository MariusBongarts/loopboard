<script setup lang="ts">
import { ref, watch } from 'vue';
import { fetchActivity, type Activity } from '../api';
import type { Issue } from '../types';
import { useWorkspace } from '../workspace';

// Local git history for an issue (#0030), fetched when first opened.
const props = defineProps<{ issue: Issue }>();
const { id: workspaceId } = useWorkspace();
const open = ref(false);
const activity = ref<Activity | null>(null);
const error = ref<string | null>(null);

async function load() {
  try {
    activity.value = await fetchActivity(workspaceId.value, props.issue.id, props.issue.archived);
    error.value = null;
  } catch (e) {
    error.value = (e as Error).message;
  }
}

watch(
  () => [props.issue.id, props.issue.status, props.issue.body],
  () => {
    if (open.value) void load();
    else activity.value = null;
  },
);

function onToggle(e: Event) {
  open.value = (e.target as HTMLDetailsElement).open;
  if (open.value && !activity.value) void load();
}
</script>

<template>
  <details class="activity" @toggle="onToggle">
    <summary>History <span class="activity-hint">from git</span></summary>
    <p v-if="error" class="ws-error">{{ error }}</p>
    <p v-else-if="!activity" class="activity-empty">Loading…</p>
    <p v-else-if="!activity.git" class="activity-empty">This repo isn't a git repository.</p>
    <template v-else>
      <div v-if="activity.branches.length" class="activity-branches">
        <span class="relations-label">Branches</span>
        <code v-for="b in activity.branches" :key="b">{{ b }}</code>
      </div>
      <div v-if="activity.history.length" class="activity-block">
        <span class="relations-label">This file</span>
        <ol class="activity-list">
          <li v-for="h in activity.history" :key="h.hash">
            <span class="activity-date">{{ h.date }}</span>
            <span v-if="h.change" class="activity-change">{{ h.change }}</span>
            <span class="activity-subject">{{ h.subject }}</span>
            <code class="activity-hash">{{ h.hash }}</code>
          </li>
        </ol>
      </div>
      <div v-if="activity.commits.length" class="activity-block">
        <span class="relations-label">Commits mentioning #{{ props.issue.id }}</span>
        <ol class="activity-list">
          <li v-for="c in activity.commits" :key="c.hash">
            <span class="activity-date">{{ c.date }}</span>
            <span class="activity-subject">{{ c.subject }}</span>
            <code class="activity-hash">{{ c.hash }}</code>
          </li>
        </ol>
      </div>
      <p v-if="!activity.history.length && !activity.commits.length && !activity.branches.length" class="activity-empty">
        Nothing in git yet — the file isn't committed.
      </p>
    </template>
  </details>
</template>
