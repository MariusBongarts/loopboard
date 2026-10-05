<script setup lang="ts">
import { computed } from 'vue';
import { GitBranch, Plus, Tag } from '@lucide/vue';
import { useIssueActions } from '../actions';
import { assigneeItems, createLabelItem, labelItems, parentItems, projectItems, statusItems, type IssueMenuContext } from '../issueMenus';
import { anchorOf, openMenu, type MenuEntry } from '../menu';
import { COLUMN_LABEL, type Issue } from '../types';
import { useWorkspace } from '../workspace';
import Avatar from './Avatar.vue';
import LabelPill from './LabelPill.vue';
import ProjectBadge from './ProjectBadge.vue';
import StatusIcon from './StatusIcon.vue';

// Status, assignee, project, labels and parent as small pickers (#0052):
// a wrapping row in the panel, a labelled list in the page's sidebar.
const props = defineProps<{ issue: Issue; layout: 'row' | 'list' }>();
const { issues, projects } = useWorkspace();
const actions = useIssueActions();

// Live data replaces issue objects on every reload; always act on the current one.
const live = () => issues.value.find((i) => i.id === props.issue.id && i.archived === props.issue.archived) ?? props.issue;
const ctx: IssueMenuContext = {
  get issues() {
    return issues.value;
  },
  get projects() {
    return projects.value;
  },
  update: (issue, edit) => actions.updateIssue(issue, edit),
};
const parent = computed(() => (props.issue.parent ? issues.value.find((i) => i.id === props.issue.parent && !i.archived) : undefined));
const readOnly = computed(() => props.issue.archived);

function pick(e: MouseEvent, label: string, items: () => MenuEntry[], filter?: string, create?: boolean) {
  if (readOnly.value) return;
  openMenu({
    label,
    at: anchorOf(e),
    items,
    filter,
    create: create ? (text) => createLabelItem(live(), ctx, text) : undefined,
  });
}
</script>

<template>
  <div class="props" :class="`props-${props.layout}`" aria-label="Properties" role="group">
    <div class="prop">
      <span v-if="props.layout === 'list'" class="prop-name">Status</span>
      <button
        type="button"
        class="prop-value"
        :aria-label="`Status: ${COLUMN_LABEL[props.issue.status]}`"
        :disabled="readOnly"
        @click="(e) => pick(e, 'Status', () => statusItems(live(), ctx))"
      >
        <StatusIcon :status="props.issue.status" />{{ COLUMN_LABEL[props.issue.status] }}
      </button>
    </div>
    <div class="prop">
      <span v-if="props.layout === 'list'" class="prop-name">Assignee</span>
      <button
        type="button"
        class="prop-value"
        :aria-label="`Assignee: ${props.issue.assignee === 'agent' ? 'Agent' : 'You'}`"
        :disabled="readOnly"
        @click="(e) => pick(e, 'Assignee', () => assigneeItems(live(), ctx))"
      >
        <Avatar :assignee="props.issue.assignee" :size="16" />{{ props.issue.assignee === 'agent' ? 'Agent' : 'You' }}
      </button>
    </div>
    <div class="prop">
      <span v-if="props.layout === 'list'" class="prop-name">Project</span>
      <button
        type="button"
        class="prop-value"
        :aria-label="`Project: ${props.issue.project ?? 'none'}`"
        :disabled="readOnly"
        @click="(e) => pick(e, 'Project', () => projectItems(live(), ctx), 'Move to project…')"
      >
        <ProjectBadge v-if="props.issue.project" :slug="props.issue.project" />
        <span v-else class="prop-empty">No project</span>
      </button>
    </div>
    <div class="prop prop-labels">
      <span v-if="props.layout === 'list'" class="prop-name">Labels</span>
      <button
        type="button"
        class="prop-value"
        :aria-label="`Labels: ${props.issue.labels.join(', ') || 'none'}`"
        :disabled="readOnly"
        @click="(e) => pick(e, 'Labels', () => labelItems(live(), ctx), 'Add or remove labels…', true)"
      >
        <LabelPill v-for="l in props.issue.labels" :key="l" :label="l" />
        <span v-if="!props.issue.labels.length" class="prop-empty"><Tag :size="13" aria-hidden="true" />Add label</span>
        <Plus v-else-if="!readOnly" class="prop-add" :size="13" aria-hidden="true" />
      </button>
    </div>
    <div class="prop">
      <span v-if="props.layout === 'list'" class="prop-name">Parent</span>
      <button
        type="button"
        class="prop-value"
        :aria-label="`Parent: ${props.issue.parent ? `#${props.issue.parent}` : 'none'}`"
        :disabled="readOnly"
        @click="(e) => pick(e, 'Parent', () => parentItems(live(), ctx), 'Set parent…')"
      >
        <template v-if="props.issue.parent">
          <StatusIcon v-if="parent" :status="parent.status" />
          <span class="prop-mono">#{{ props.issue.parent }}</span>
          <span v-if="props.layout === 'list' && parent" class="prop-clip">{{ parent.title }}</span>
        </template>
        <span v-else class="prop-empty"><GitBranch :size="13" aria-hidden="true" />{{ props.layout === 'list' ? 'No parent' : 'Parent' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.props-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.props-list { display: grid; gap: 2px; }
.prop { display: flex; align-items: center; min-width: 0; }
.props-list .prop { display: grid; grid-template-columns: 76px minmax(0, 1fr); align-items: center; min-height: 32px; }
.prop-name { font-size: 12.5px; color: var(--text-3); }
.prop-value {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  min-width: 0;
  max-width: 100%;
  padding: 3px 8px;
  border: 1px solid transparent;
  border-radius: var(--r);
  background: transparent;
  color: var(--text);
  font-size: 12.5px;
  font-weight: 500;
  text-align: left;
}
.props-row .prop-value { border-color: var(--border); }
.prop-value:hover:not(:disabled) { background: var(--bg-hover); border-color: var(--border); }
.props-list .prop-value { justify-self: start; }
.prop-value:disabled { opacity: 1; cursor: default; }
.prop-empty { display: inline-flex; align-items: center; gap: 6px; color: var(--text-3); font-weight: 400; }
.prop-add { color: var(--text-3); }
.prop-mono { font: 11.5px var(--mono); color: var(--text-2); }
.prop-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 400; color: var(--text-2); }
</style>
