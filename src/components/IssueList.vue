<script setup lang="ts">
import { ref } from 'vue';
import { toneClass } from '../colors';
import type { Group } from '../list';
import type { Issue } from '../types';

// Dense, grouped rows (#0031) — Linear's default layout.
const props = defineProps<{ groups: Group[]; activeId?: string | null; showProject?: boolean }>();
const emit = defineEmits<{ (e: 'open', issue: Issue): void }>();
const collapsed = ref(new Set<string>());

function toggle(key: string) {
  const next = new Set(collapsed.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  collapsed.value = next;
}
</script>

<template>
  <div class="issue-list">
    <p v-if="!props.groups.some((g) => g.issues.length)" class="list-empty">No issues match.</p>
    <section v-for="g in props.groups" :key="g.key" class="issue-group">
      <button type="button" class="issue-group-head" :aria-expanded="!collapsed.has(g.key)" @click="toggle(g.key)">
        <span class="issue-group-caret" aria-hidden="true">{{ collapsed.has(g.key) ? '▸' : '▾' }}</span>
        {{ g.label }} <span class="issue-group-count">{{ g.issues.length }}</span>
      </button>
      <template v-if="!collapsed.has(g.key)">
        <button
          v-for="i in g.issues"
          :key="`${g.key}:${i.id}`"
          type="button"
          class="issue-row"
          :class="{ on: i.id === props.activeId }"
          :data-issue-id="i.id"
          @click="emit('open', i)"
        >
          <span class="card-id">#{{ i.id }}</span>
          <span class="issue-row-title">{{ i.title }}</span>
          <span v-for="l in i.labels" :key="l" class="card-label" :class="toneClass(l)">{{ l }}</span>
          <span v-if="props.showProject && i.project" class="card-project" :class="toneClass(i.project)">{{ i.project }}</span>
          <span class="feed-status" :class="`s-${i.status}`">{{ i.status }}</span>
          <span class="feed-who" :class="i.assignee">{{ i.assignee }}</span>
          <span class="issue-row-date">{{ i.created ?? '' }}</span>
        </button>
      </template>
    </section>
  </div>
</template>
