<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { marked } from 'marked';
import type { Issue, Project } from '../types';
import { columnForStatus } from '../types';
import { toneClass } from '../colors';

type Tab = 'prd' | 'wip';

const props = defineProps<{
  project: Project | null;
  issues: Issue[];
}>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'open-issue', issue: Issue): void;
}>();

const tab = ref<Tab>('prd');

// Reset to PRD every time the drawer is (re-)opened.
watch(
  () => props.project?.slug,
  (slug) => {
    if (slug) tab.value = 'prd';
  },
);

// Match links pointing at issue files: ../../issues/NNNN-...md or
// ../../issues/_archive/NNNN-...md (any number of leading `../`).
const ISSUE_LINK_RE = /(?:^|\/)issues\/(_archive\/)?(\d{4})-[a-z0-9-]+\.md$/i;

// Headings that get collapsed in the project drawer. Phase headings
// (H3 "Phase N — ...") and primary H2s (Problem statement, Solution,
// User stories, Implementation decisions, Phases, Current focus)
// stay open. Anything else not in this set also stays open — safe
// fallback for new H2s we don't know about.
const COLLAPSED_HEADINGS = new Set([
  'activity log',
  'deferred / out of scope',
  'ship summary',
  'out of scope',
  'further notes',
  'testing decisions',
]);

function statusPillClass(status: Issue['status']): string {
  // Mirror the per-status classes used on cards: workflow side states
  // get `card-side <status>`, terminal/workflow stays a generic chip.
  const col = columnForStatus(status);
  if (['blocked', 'needs-info', 'ready-for-human', 'wontfix'].includes(col)) {
    return `pill pill-side ${col}`;
  }
  return `pill pill-status ${col}`;
}

function resolveIssueFromHref(href: string): Issue | null {
  const m = href.match(ISSUE_LINK_RE);
  if (!m) return null;
  const archived = !!m[1];
  const id = m[2];
  return (
    props.issues.find((i) => i.id === id && i.archived === archived) ?? null
  );
}

function postProcess(html: string, mode: Tab): string {
  const root = document.createElement('div');
  root.innerHTML = html;

  // 1) Status-pill overlay (WIP only). Walk every <a> matching the
  //    issue link pattern; append a pill <span> as a sibling to the
  //    anchor inside the same <li>. Skip if already wrapped.
  if (mode === 'wip') {
    const anchors = root.querySelectorAll<HTMLAnchorElement>('a[href]');
    anchors.forEach((a) => {
      const issue = resolveIssueFromHref(a.getAttribute('href') ?? '');
      if (!issue) return;
      // Only annotate when the anchor lives inside a list item — the
      // phase checklist shape. PRD body links are PRD-only.
      const li = a.closest('li');
      if (!li) return;
      // Idempotent: skip if a pill is already attached to this li.
      if (li.querySelector(':scope > .pill')) return;
      const pill = document.createElement('span');
      pill.className = statusPillClass(issue.status);
      pill.textContent = issue.status;
      li.appendChild(pill);
    });
  }

  // 2) Collapse secondary H2 sections into <details closed>. Walk
  //    children of the root in order; whenever we hit an <h2> whose
  //    text is in COLLAPSED_HEADINGS, gather siblings up to (but not
  //    including) the next <h2>, move them into a <details>.
  const children = Array.from(root.children);
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.tagName !== 'H2') continue;
    const headingText = (node.textContent ?? '').trim().toLowerCase();
    if (!COLLAPSED_HEADINGS.has(headingText)) continue;

    const details = document.createElement('details');
    details.className = 'doc-collapsed';
    const summary = document.createElement('summary');
    summary.textContent = node.textContent ?? '';
    details.appendChild(summary);

    // Move siblings until next <h2> (or end) into the details.
    let j = i + 1;
    while (j < children.length && children[j].tagName !== 'H2') {
      details.appendChild(children[j]);
      j++;
    }

    node.replaceWith(details);
  }

  return root.innerHTML;
}

const renderedBody = computed(() => {
  if (!props.project) return '';
  const md = tab.value === 'prd' ? props.project.prdBody : props.project.wipBody;
  if (!md) return '';
  const raw = marked.parse(md, { gfm: true, breaks: false }) as string;
  return postProcess(raw, tab.value);
});

function onBodyClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
  if (!anchor) return;
  const issue = resolveIssueFromHref(anchor.getAttribute('href') ?? '');
  if (!issue) return;
  e.preventDefault();
  emit('open-issue', issue);
}
</script>

<template>
  <template v-if="props.project">
    <div class="drawer-backdrop project-drawer-backdrop" @click="emit('close')" />
    <aside
      class="drawer project-drawer"
      role="dialog"
      aria-label="Project documentation"
    >
      <div class="drawer-head">
        <div>
          <div class="card-top" style="margin-bottom: 4px;">
            <span class="card-project" :class="toneClass(props.project.slug)">{{ props.project.slug }}</span>
            <span
              v-if="props.project.status !== 'unknown'"
              class="pstatus"
              :class="props.project.status"
            >{{ props.project.status }}</span>
          </div>
          <h2>{{ props.project.title }}</h2>
        </div>
        <button class="close" @click="emit('close')">Close</button>
      </div>
      <div class="project-tabs" role="tablist">
        <button
          role="tab"
          class="project-tab"
          :class="{ active: tab === 'prd' }"
          :aria-selected="tab === 'prd'"
          @click="tab = 'prd'"
        >PRD</button>
        <button
          role="tab"
          class="project-tab"
          :class="{ active: tab === 'wip' }"
          :aria-selected="tab === 'wip'"
          @click="tab = 'wip'"
        >WIP</button>
      </div>
      <div class="drawer-body project-body" @click="onBodyClick" v-html="renderedBody" />
    </aside>
  </template>
</template>
