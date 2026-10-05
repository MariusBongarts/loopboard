<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { marked } from 'marked';
import type { Issue } from '../types';
import { isClosed, relativePath } from '../types';
import { useWorkspace } from '../workspace';
import { useIssueActions } from '../actions';
import { fetchDoc, saveDoc } from '../api';
import { toggleTask } from '../tasks';
import { linkifyIssueRefs } from '../linkify';
import DocEditor from './DocEditor.vue';
import IssueActivity from './IssueActivity.vue';
import { toneClass } from '../colors';

const props = defineProps<{ issue: Issue | null }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'send-to-backlog', issue: Issue): void;
}>();

const { id: workspaceId, rootName, relations, issues } = useWorkspace();

// Checkboxes are live: one click toggles the task in the file (#0026).
const html = computed(() => {
  if (!props.issue) return '';
  let n = 0;
  const known = new Set(issues.value.map((i) => i.id));
  const rendered = linkifyIssueRefs(marked.parse(props.issue.body, { gfm: true, breaks: false }) as string, (id) => known.has(id));
  return rendered.replace(
    /<input (checked="" )?disabled="" type="checkbox">/g,
    (_m, checked: string | undefined) => `<input ${checked ?? ''}type="checkbox" data-task-index="${n++}" aria-label="Toggle task">`,
  );
});

async function toggleTaskAt(index: number) {
  if (!props.issue) return;
  for (let attempt = 0; attempt < 2; attempt++) {
    const doc = await fetchDoc(workspaceId.value, docPath.value);
    const next = toggleTask(doc.content, index);
    if (next === null) return;
    const result = await saveDoc(workspaceId.value, docPath.value, next, doc.hash);
    if (result.ok) return;
  }
}

function onBodyClick(e: MouseEvent) {
  const ref = (e.target as HTMLElement).closest('button.issue-ref[data-ref]');
  if (ref) {
    const id = ref.getAttribute('data-ref');
    const target = issues.value.find((i) => i.id === id && !i.archived) ?? issues.value.find((i) => i.id === id);
    if (target) actions.openIssue(target);
    return;
  }
  const box = (e.target as HTMLElement).closest('input[data-task-index]');
  if (!box) return;
  void toggleTaskAt(Number(box.getAttribute('data-task-index')));
}

const actions = useIssueActions();
// Blocking relations from `parent:` (#0028).
const parent = computed(() => (props.issue ? relations.value.parentOf(props.issue) : null));
const children = computed(() => (props.issue ? relations.value.childrenOf(props.issue) : []));
const childrenDone = computed(() => children.value.filter((c) => isClosed(c.status)).length);
// In-place editing (#0024): the editor replaces the rendered body.
const editing = ref(false);
const docPath = computed(() =>
  props.issue ? `issues/${props.issue.archived ? '_archive/' : ''}${props.issue.filename}` : '',
);
const version = computed(() => (props.issue ? JSON.stringify(props.issue) : ''));
watch(
  () => props.issue?.id,
  () => (editing.value = false),
);
function onBackdrop() {
  if (!editing.value) emit('close');
}
const path = computed(() => (props.issue ? relativePath(props.issue, rootName.value) : ''));
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

async function copyPath() {
  const value = path.value;
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Clipboard API unavailable (older browsers / non-secure contexts).
    // The element's title= attribute remains as a fallback affordance.
    return;
  }
  copied.value = true;
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    copied.value = false;
  }, 1200);
}

function onSendToBacklog() {
  if (!props.issue) return;
  emit('send-to-backlog', props.issue);
  emit('close');
}
</script>

<template>
  <template v-if="props.issue">
    <div class="drawer-backdrop" @click="onBackdrop" />
    <aside class="drawer" role="dialog" aria-label="Issue detail">
      <div class="drawer-head">
        <div>
          <div class="card-top" style="margin-bottom: 4px;">
            <span class="card-id">#{{ props.issue.id }}</span>
            <span class="card-cat" :class="props.issue.category">{{ props.issue.category }}</span>
            <span class="card-cat" style="text-transform: none;">{{ props.issue.status }}</span>
          </div>
          <h2>{{ props.issue.title }}</h2>
        </div>
        <button class="close" @click="$emit('close')">Close</button>
      </div>
      <div class="drawer-meta">
        <span
          v-if="props.issue.project"
          class="card-project"
          :class="toneClass(props.issue.project)"
        >{{ props.issue.project }}</span>
        <span v-else class="card-project standalone">standalone</span>
        <span v-if="props.issue.phase" class="card-label">phase {{ props.issue.phase }}</span>
        <span v-if="props.issue.parent" class="card-label">parent #{{ props.issue.parent }}</span>
        <span v-if="props.issue.created" class="card-label">{{ props.issue.created }}</span>
        <span v-if="props.issue.archived" class="card-label">archived</span>
        <span v-if="props.issue.reviewed" class="marker marker-reviewed" :title="`Reviewed ${props.issue.reviewed}`">✓ reviewed {{ props.issue.reviewed }}</span>
        <span v-if="props.issue.deployed" class="marker marker-deployed" :title="`Deployed ${props.issue.deployed}`">↑ deployed {{ props.issue.deployed }}</span>
        <span
          v-for="l in props.issue.labels"
          :key="l"
          class="card-label"
          :class="toneClass(l)"
        >{{ l }}</span>
        <button
          type="button"
          class="drawer-path"
          :title="path"
          @click="copyPath"
        >{{ path }}</button>
        <span v-if="copied" class="drawer-path-copied">Copied</span>
        <span class="drawer-actions-gap" />
        <button v-if="!editing" type="button" class="drawer-action" @click="editing = true">Edit</button>
        <button v-if="!props.issue.archived" type="button" class="drawer-action" @click="actions.copyIssuePrompt(props.issue)">
          Copy agent prompt
        </button>
        <button
          v-if="props.issue.status === 'done' && !props.issue.archived"
          type="button"
          class="drawer-action"
          @click="actions.setReviewed(props.issue, !props.issue.reviewed)"
        >{{ props.issue.reviewed ? 'Unmark reviewed' : 'Mark reviewed' }}</button>
        <button
          v-if="props.issue.status === 'todo' && !props.issue.archived"
          type="button"
          class="drawer-send-to-backlog"
          title="Send to backlog — defer this issue until ready to schedule"
          @click="onSendToBacklog"
        >Send to backlog</button>
      </div>
      <section v-if="!editing && (parent || children.length)" class="relations" aria-label="Relations">
        <div v-if="parent" class="relations-row">
          <span class="relations-label">{{ parent !== 'missing' && isClosed(parent.status) ? 'After' : 'Blocked by' }}</span>
          <button v-if="parent !== 'missing'" type="button" class="relations-link" @click="actions.openIssue(parent)">
            <span class="card-id">#{{ parent.id }}</span> {{ parent.title }}
            <span class="feed-status" :class="`s-${parent.status}`">{{ parent.status }}</span>
          </button>
          <span v-else class="relations-missing">#{{ props.issue.parent }} — no such issue</span>
        </div>
        <div v-if="children.length" class="relations-row relations-children">
          <span class="relations-label">Blocks · {{ childrenDone }}/{{ children.length }} done</span>
          <button v-for="c in children" :key="c.id" type="button" class="relations-link" @click="actions.openIssue(c)">
            <span class="relations-check" :class="{ done: isClosed(c.status) }" aria-hidden="true" />
            <span class="card-id">#{{ c.id }}</span> {{ c.title }}
            <span class="feed-status" :class="`s-${c.status}`">{{ c.status }}</span>
          </button>
        </div>
      </section>
      <IssueActivity v-if="!editing" :key="props.issue.id" :issue="props.issue" />
      <DocEditor v-if="editing" :path="docPath" :version="version" @close="editing = false" />
      <div v-else class="drawer-body" @click="onBodyClick" v-html="html" />
    </aside>
  </template>
</template>
