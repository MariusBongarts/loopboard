<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Search, X } from '@lucide/vue';
import { useIssueActions } from '../actions';
import { backlogGroups } from '../list';
import { toast } from '../toast';
import { tokenizeQuery, type ColumnKey, type Issue } from '../types';
import { useWorkspace } from '../workspace';
import BacklogGroup from './BacklogGroup.vue';
import StatusIcon from './StatusIcon.vue';

// Every backlog idea, by project, in the order you want them (#0139).
const emit = defineEmits<{
  (e: 'reorder', payload: { column: ColumnKey; ids: string[]; draggedId: string }): void;
}>();
const route = useRoute();
const router = useRouter();
const { issues, projects } = useWorkspace();
const actions = useIssueActions();

const q = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''));
function setQuery(value: string) {
  void router.replace({ query: value ? { q: value } : {} });
}

const projectTitle = (slug: string) => projects.value.find((p) => p.slug === slug)?.title ?? slug;
const groups = computed(() => backlogGroups(issues.value, tokenizeQuery(q.value), projectTitle));
const flat = computed(() => groups.value.flatMap((g) => g.issues));

function promote(issue: Issue) {
  actions.updateIssue(issue, { status: 'todo' });
  toast(`#${issue.id} moved to Todo`);
}
</script>

<template>
  <section class="pane-view backlog-view" aria-label="Backlog">
    <header class="pane-head backlog-view-head">
      <div class="pane-title-row">
        <StatusIcon status="backlog" />
        <h2 class="pane-title">Backlog</h2>
        <span class="backlog-view-count">{{ flat.length }}</span>
      </div>
    </header>
    <div class="view-tools">
      <label class="view-search">
        <Search :size="14" aria-hidden="true" />
        <input :value="q" type="search" placeholder="Filter backlog" aria-label="Filter backlog" @input="(e) => setQuery((e.target as HTMLInputElement).value)" />
      </label>
      <button v-if="q" type="button" class="ghost view-clear" @click="setQuery('')"><X :size="14" aria-hidden="true" />Clear</button>
      <span class="backlog-view-hint">Drag to set priority, or <kbd>Alt</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> on a focused row</span>
    </div>
    <div class="backlog-view-body">
      <p v-if="flat.length === 0 && q" class="list-empty">No ideas match “{{ q }}”.</p>
      <p v-else-if="flat.length === 0" class="list-empty">No backlog ideas. Press <kbd>C</kbd> to capture one.</p>
      <BacklogGroup
        v-for="g in groups"
        :key="g.key"
        :group="g"
        @open="(i) => actions.openIssue(i, flat)"
        @promote="promote"
        @reorder="(p) => emit('reorder', p)"
      />
    </div>
  </section>
</template>

<style scoped>
.backlog-view-head { padding-bottom: 10px; }
.backlog-view-count { font-size: 13px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.backlog-view-hint { margin-left: auto; font-size: 12px; color: var(--text-4); }
.backlog-view-body { flex: 1; padding: 14px 0 40px; }
</style>
