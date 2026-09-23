<script setup lang="ts">
import { ref } from 'vue';
import type { Issue } from '../types';
import { relativePath } from '../types';
import { toneClass } from '../colors';
import AgentIcon from './icons/AgentIcon.vue';
import HumanIcon from './icons/HumanIcon.vue';

const props = defineProps<{
  open: boolean;
  issues: Issue[];
}>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'open-issue' | 'promote', issue: Issue): void;
}>();

// Brief moss-soft "Promoted" flash next to a row whose promote button
// was just clicked. Keyed by issue id; cleared on a short timer so
// the row can fade out before the next refresh removes it for real.
const promoting = ref<Set<string>>(new Set());

function onPromote(e: MouseEvent, issue: Issue) {
  e.stopPropagation();
  promoting.value.add(issue.id);
  emit('promote', issue);
  setTimeout(() => {
    promoting.value.delete(issue.id);
  }, 1200);
}

function onRowClick(issue: Issue) {
  emit('open-issue', issue);
}
</script>

<template>
  <template v-if="props.open">
    <div class="drawer-backdrop project-drawer-backdrop" @click="emit('close')" />
    <aside
      class="drawer project-drawer backlog-drawer"
      role="dialog"
      aria-label="Backlog"
    >
      <div class="drawer-head">
        <div>
          <div class="card-top" style="margin-bottom: 4px;">
            <span class="card-id">Backlog</span>
            <span class="pstatus">{{ props.issues.length }} ideas</span>
          </div>
          <h2>Future ideas, not yet scheduled</h2>
        </div>
        <button class="close" @click="emit('close')">Close</button>
      </div>
      <div class="drawer-body backlog-body">
        <p
          v-if="props.issues.length === 0"
          class="backlog-empty"
        >No backlog issues match the current filter.</p>
        <ul v-else class="backlog-list">
          <li
            v-for="iss in props.issues"
            :key="iss.id + (iss.archived ? ':a' : '')"
            class="backlog-row"
            :class="{ promoting: promoting.has(iss.id) }"
            @click="onRowClick(iss)"
          >
            <div class="backlog-row-top">
              <span class="card-id">#{{ iss.id }}</span>
              <span class="card-cat" :class="iss.category">{{ iss.category }}</span>
              <span
                class="card-assignee card-assignee-icon"
                :class="`assignee-${iss.assignee}`"
                :title="`Assignee: ${iss.assignee}`"
              >
                <AgentIcon v-if="iss.assignee === 'agent'" />
                <HumanIcon v-else />
              </span>
              <button
                v-if="!promoting.has(iss.id)"
                type="button"
                class="backlog-promote"
                title="Promote to Todo"
                @click="(e) => onPromote(e, iss)"
              >Promote → Todo</button>
              <span v-else class="backlog-promoted">Promoted</span>
            </div>
            <div class="backlog-row-title">{{ iss.title }}</div>
            <div class="backlog-row-meta">
              <span
                v-if="iss.project"
                class="card-project"
                :class="toneClass(iss.project)"
              >{{ iss.project }}</span>
              <span v-else class="card-project standalone">standalone</span>
              <span
                v-for="l in iss.labels"
                :key="l"
                class="card-label"
                :class="toneClass(l)"
              >{{ l }}</span>
              <span class="backlog-row-path">{{ relativePath(iss) }}</span>
            </div>
          </li>
        </ul>
      </div>
    </aside>
  </template>
</template>
