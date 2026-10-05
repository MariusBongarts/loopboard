<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, ChevronRight } from '@lucide/vue';
import { useWorkspace } from '../workspace';
import IssueView from './IssueView.vue';
import ProjectBadge from './ProjectBadge.vue';

// An issue as a full page at /w/:ws/issues/:id (#0051).
const props = defineProps<{ issueId: string; archived: boolean; loaded: boolean }>();
const router = useRouter();
const { id: workspaceId, issues } = useWorkspace();
const issue = computed(
  () =>
    issues.value.find((i) => i.id === props.issueId && i.archived === props.archived) ??
    issues.value.find((i) => i.id === props.issueId),
);

function back() {
  if (window.history.state?.back) router.back();
  else void router.push(`/w/${workspaceId.value}`);
}
</script>

<template>
  <section class="issue-page" aria-label="Issue">
    <header class="issue-page-bar">
      <button type="button" class="ghost back" @click="back"><ArrowLeft :size="15" aria-hidden="true" />Back</button>
      <nav v-if="issue" class="issue-page-crumbs" aria-label="Breadcrumb">
        <ProjectBadge :slug="issue.project" />
        <ChevronRight :size="14" aria-hidden="true" />
        <span class="issue-page-id">#{{ issue.id }}</span>
      </nav>
    </header>
    <div class="issue-page-scroll">
      <IssueView v-if="issue" :issue="issue" layout="page" />
      <div v-else-if="props.loaded" class="issue-page-missing">
        <h2>No issue #{{ props.issueId }}</h2>
        <p>It may have been renumbered or deleted.</p>
        <RouterLink :to="`/w/${workspaceId}`">Back to the board</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.issue-page { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.issue-page-bar { display: flex; align-items: center; gap: 12px; height: 48px; padding: 0 20px; border-bottom: 1px solid var(--border-subtle); flex: 0 0 auto; }
.back { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; }
.issue-page-crumbs { display: flex; align-items: center; gap: 6px; color: var(--text-4); min-width: 0; }
.issue-page-id { font: 12px var(--mono); color: var(--text-2); }
.issue-page-scroll { flex: 1; overflow-y: auto; padding: 28px 40px 60px; }
.issue-page-scroll > :deep(.issue-view) { max-width: 1120px; margin: 0 auto; }
.issue-page-missing { max-width: 480px; margin: 60px auto; text-align: center; color: var(--text-2); }
.issue-page-missing h2 { margin: 0 0 6px; font-size: 18px; color: var(--text); }
</style>
