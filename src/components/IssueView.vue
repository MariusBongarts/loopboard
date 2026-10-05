<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { marked } from 'marked';
import { CheckCheck, Copy, Pencil, SquareArrowOutUpRight, TerminalSquare } from '@lucide/vue';
import { useIssueActions } from '../actions';
import { fetchDoc, saveDoc } from '../api';
import { EDITOR_LABEL, editorChoice, issueEditorUrl } from '../editor';
import { linkifyIssueRefs } from '../linkify';
import { copyWithToast } from '../prompts';
import { toggleTask } from '../tasks';
import { isClosed, relativePath, type Issue } from '../types';
import { useWorkspace } from '../workspace';
import DocEditor from './DocEditor.vue';
import IssueActivity from './IssueActivity.vue';
import IssueProperties from './IssueProperties.vue';
import StatusIcon from './StatusIcon.vue';

// One issue, read and edited in place (#0050, #0051): the same view renders
// in the side panel and on the full page.
const props = defineProps<{ issue: Issue; layout: 'panel' | 'page' }>();
const { id: workspaceId, rootName, root, relations, issues } = useWorkspace();
const actions = useIssueActions();

const CATEGORY: Record<string, string> = { task: 'Task', 'user-story': 'Story', bug: 'Bug' };

// Checkboxes are live: one click toggles the task in the file (#0026).
const html = computed(() => {
  let n = 0;
  const known = new Set(issues.value.map((i) => i.id));
  const rendered = linkifyIssueRefs(marked.parse(props.issue.body, { gfm: true, breaks: false }) as string, (id) => known.has(id));
  return rendered.replace(
    /<input (checked="" )?disabled="" type="checkbox">/g,
    (_m, checked: string | undefined) => `<input ${checked ?? ''}type="checkbox" data-task-index="${n++}" aria-label="Toggle task">`,
  );
});

const docPath = computed(() => `issues/${props.issue.archived ? '_archive/' : ''}${props.issue.filename}`);
const version = computed(() => JSON.stringify(props.issue));
const path = computed(() => relativePath(props.issue, rootName.value));
const editorHref = computed(() => issueEditorUrl(editorChoice.value, root.value, props.issue));

async function toggleTaskAt(index: number) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const doc = await fetchDoc(workspaceId.value, docPath.value);
    const next = toggleTask(doc.content, index);
    if (next === null) return;
    const result = await saveDoc(workspaceId.value, docPath.value, next, doc.hash);
    if (result.ok) return;
  }
}

function onBodyClick(e: MouseEvent) {
  if (!(e.target instanceof Element)) return;
  const ref = e.target.closest('button.issue-ref[data-ref]');
  if (ref) {
    const id = ref.getAttribute('data-ref');
    const target = issues.value.find((i) => i.id === id && !i.archived) ?? issues.value.find((i) => i.id === id);
    if (target) actions.openIssue(target);
    return;
  }
  const box = e.target.closest('input[data-task-index]');
  if (box) void toggleTaskAt(Number(box.getAttribute('data-task-index')));
}

// Blocking relations from `parent:` (#0028).
const parent = computed(() => relations.value.parentOf(props.issue));
const children = computed(() => relations.value.childrenOf(props.issue));
const childrenDone = computed(() => children.value.filter((c) => isClosed(c.status)).length);
const waiting = computed(() => relations.value.isWaiting(props.issue));

// In-place editing (#0024): the editor replaces the rendered body.
const editing = ref(false);
watch(
  () => props.issue.id,
  () => (editing.value = false),
);

function copyPath() {
  void copyWithToast(path.value, 'Path copied');
}
</script>

<template>
  <article class="issue-view" :class="`issue-view-${props.layout}`">
    <div class="issue-view-main">
      <div class="issue-view-meta">
        <span class="issue-view-id">#{{ props.issue.id }}</span>
        <span>{{ CATEGORY[props.issue.category] ?? props.issue.category }}</span>
        <span v-if="props.issue.archived" class="pill">Archived</span>
        <span v-if="waiting" class="marker marker-waiting">waiting on #{{ props.issue.parent }}</span>
        <span v-if="props.issue.reviewed" class="marker marker-reviewed" :title="`Reviewed ${props.issue.reviewed}`">✓ reviewed {{ props.issue.reviewed }}</span>
        <span v-if="props.issue.deployed" class="marker marker-deployed" :title="`Deployed ${props.issue.deployed}`">↑ deployed {{ props.issue.deployed }}</span>
      </div>
      <component :is="props.layout === 'page' ? 'h1' : 'h2'" class="issue-view-title">{{ props.issue.title }}</component>

      <template v-if="props.layout === 'panel'">
        <IssueProperties :issue="props.issue" layout="row" />
        <div class="issue-view-actions">
          <button v-if="!editing" type="button" class="ghost" @click="editing = true"><Pencil :size="14" aria-hidden="true" />Edit</button>
          <a v-if="editorHref" class="ghost-link" :href="editorHref"><SquareArrowOutUpRight :size="14" aria-hidden="true" />Open in {{ EDITOR_LABEL[editorChoice] }}</a>
          <button v-if="!props.issue.archived" type="button" class="ghost" @click="actions.copyIssuePrompt(props.issue)"><TerminalSquare :size="14" aria-hidden="true" />Copy agent prompt</button>
          <button type="button" class="ghost" :title="path" @click="copyPath"><Copy :size="14" aria-hidden="true" />Copy path</button>
          <button
            v-if="props.issue.status === 'done' && !props.issue.archived"
            type="button"
            class="ghost"
            @click="actions.setReviewed(props.issue, !props.issue.reviewed)"
          ><CheckCheck :size="14" aria-hidden="true" />{{ props.issue.reviewed ? 'Unmark reviewed' : 'Mark reviewed' }}</button>
        </div>
      </template>

      <section v-if="!editing && (parent || children.length)" class="relations" aria-label="Relations">
        <div v-if="parent" class="relations-row">
          <span class="relations-label">{{ parent !== 'missing' && isClosed(parent.status) ? 'After' : 'Blocked by' }}</span>
          <button v-if="parent !== 'missing'" type="button" class="relations-link" @click="actions.openIssue(parent)">
            <StatusIcon :status="parent.status" />
            <span class="issue-view-id">#{{ parent.id }}</span> {{ parent.title }}
          </button>
          <span v-else class="relations-missing">#{{ props.issue.parent }} — no such issue</span>
        </div>
        <div v-if="children.length" class="relations-row relations-children">
          <span class="relations-label">Blocks · {{ childrenDone }}/{{ children.length }} done</span>
          <button v-for="c in children" :key="c.id" type="button" class="relations-link" @click="actions.openIssue(c)">
            <StatusIcon :status="c.status" />
            <span class="issue-view-id">#{{ c.id }}</span> {{ c.title }}
          </button>
        </div>
      </section>

      <DocEditor v-if="editing" :path="docPath" :version="version" @close="editing = false" />
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-else class="issue-view-body prose" @click="onBodyClick" v-html="html" />
      <IssueActivity v-if="!editing" :key="props.issue.id" :issue="props.issue" />
    </div>

    <aside v-if="props.layout === 'page'" class="issue-view-side" aria-label="Details">
      <IssueProperties :issue="props.issue" layout="list" />
      <dl class="issue-view-facts">
        <template v-if="props.issue.created"><dt>Created</dt><dd>{{ props.issue.created }}</dd></template>
        <template v-if="props.issue.phase"><dt>Phase</dt><dd>{{ props.issue.phase }}</dd></template>
        <template v-if="props.issue.reviewed"><dt>Reviewed</dt><dd>{{ props.issue.reviewed }}</dd></template>
        <template v-if="props.issue.deployed"><dt>Deployed</dt><dd>{{ props.issue.deployed }}</dd></template>
        <dt>File</dt><dd><button type="button" class="issue-view-path" :title="path" @click="copyPath">{{ path }}</button></dd>
      </dl>
      <div class="issue-view-side-actions">
        <button v-if="!editing" type="button" @click="editing = true"><Pencil :size="14" aria-hidden="true" />Edit</button>
        <a v-if="editorHref" class="button-link" :href="editorHref"><SquareArrowOutUpRight :size="14" aria-hidden="true" />Open in {{ EDITOR_LABEL[editorChoice] }}</a>
        <button v-if="!props.issue.archived" type="button" @click="actions.copyIssuePrompt(props.issue)"><TerminalSquare :size="14" aria-hidden="true" />Copy agent prompt</button>
        <button
          v-if="props.issue.status === 'done' && !props.issue.archived"
          type="button"
          @click="actions.setReviewed(props.issue, !props.issue.reviewed)"
        ><CheckCheck :size="14" aria-hidden="true" />{{ props.issue.reviewed ? 'Unmark reviewed' : 'Mark reviewed' }}</button>
      </div>
    </aside>
  </article>
</template>

<style scoped>
.issue-view { display: grid; gap: 28px; color: var(--text); }
.issue-view-page { grid-template-columns: minmax(0, 1fr) 280px; align-items: start; }
.issue-view-main { display: grid; gap: 14px; min-width: 0; align-content: start; }
.issue-view-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 12px; color: var(--text-3); }
.issue-view-id { font: 11.5px var(--mono); color: var(--text-3); }
.issue-view-title { margin: 0; font-size: 20px; font-weight: 600; line-height: 1.3; letter-spacing: -0.015em; }
.issue-view-page .issue-view-title { font-size: 26px; letter-spacing: -0.02em; }
.issue-view-actions { display: flex; flex-wrap: wrap; gap: 2px; margin: -4px 0 0 -8px; }
.issue-view-actions button, .ghost-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  font-size: 12.5px;
}
.ghost-link { border-radius: var(--r); color: var(--text-2); font-weight: 500; text-decoration: none; }
.ghost-link:hover { background: var(--bg-hover); color: var(--text); }

.issue-view-side { position: sticky; top: 16px; display: grid; gap: 16px; padding: 14px; border: 1px solid var(--border); border-radius: var(--r-lg); background: var(--bg-subtle); }
.issue-view-facts { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 8px 0; margin: 0; padding-top: 12px; border-top: 1px solid var(--border-subtle); font-size: 12.5px; }
.issue-view-facts dt { color: var(--text-3); }
.issue-view-facts dd { margin: 0; min-width: 0; color: var(--text-2); }
.issue-view-path { max-width: 100%; padding: 0; border: 0; background: transparent; font: 11px var(--mono); color: var(--text-3); text-align: left; overflow-wrap: anywhere; }
.issue-view-path:hover { background: transparent; color: var(--accent-text); }
.issue-view-side-actions { display: grid; gap: 6px; padding-top: 12px; border-top: 1px solid var(--border-subtle); }
.issue-view-side-actions > * { justify-content: flex-start; display: inline-flex; align-items: center; gap: 6px; }

@media (max-width: 1100px) {
  .issue-view-page { grid-template-columns: minmax(0, 1fr); }
  .issue-view-side { position: static; order: -1; }
}
</style>
