<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { marked } from 'marked';
import { ArrowLeft, ChevronLeft, ChevronRight, Link2, SquareArrowOutUpRight, X } from '@lucide/vue';
import { provideIssueActions, useIssueActions } from '../../actions';
import { findRun, issueOrigins, issuesOfRun, runKey, runSummary, splitRunNote } from '../../home';
import { dayLabel, todayIso } from '../../inbox';
import { linkifyIssueRefs } from '../../linkify';
import { usePeek } from '../../peek';
import { copyWithToast } from '../../prompts';
import { newestFirst, nextSlotText, routineWhen, runDuration } from '../../routines';
import { COLUMN_LABEL, isClosed, type Issue } from '../../types';
import { useWorkspace } from '../../workspace';
import BaseDialog from '../BaseDialog.vue';
import IssueView from '../IssueView.vue';
import ProjectBadge from '../ProjectBadge.vue';
import IssueLine from './IssueLine.vue';
import PeekLink from './PeekLink.vue';
import RunDot from './RunDot.vue';
import RunStrip from './RunStrip.vue';
import RunTag from './RunTag.vue';

// Home's previews (#0130, #0131): a run, an issue, a project or a routine in
// a dialog with its own link. Links inside open the next preview.
const emit = defineEmits<{ (e: 'open-project', slug: string): void }>();
const router = useRouter();
const nav = usePeek();
const { id: workspaceId, issues, projects, routines } = useWorkspace();
const today = computed(() => todayIso());
const now = () => Date.now();

// Issue links inside an issue's own body open the next preview, not the panel.
const actions = useIssueActions();
provideIssueActions({ ...actions, openIssue: (issue) => nav.open({ kind: 'issue', id: issue.id }) });

const allRoutines = computed(() => routines.value?.routines ?? []);
const liveById = computed(() => new Map(issues.value.filter((i) => !i.archived).map((i) => [i.id, i])));
const peek = nav.current;

const run = computed(() => (peek.value?.kind === 'run' ? findRun(allRoutines.value, peek.value.slug, peek.value.key) : null));
const runIssues = computed(() => (run.value ? issuesOfRun(run.value.run, run.value.routine, liveById.value) : { filed: [], mentioned: [] }));
const runBody = computed(() => {
  if (!run.value) return '';
  const note = run.value.run.note ?? '';
  const { head, rest } = splitRunNote(note);
  const text = head.length > 170 ? note : rest;
  return text.trim() ? linkifyIssueRefs(marked.parse(text, { gfm: true, breaks: true }) as string, (id) => liveById.value.has(id)) : '';
});
const runWhen = computed(() => {
  const r = run.value?.run;
  if (!r) return '';
  const end = r.finished ? `–${r.finished.slice(11, 16)}` : '';
  return `${dayLabel(r.at.slice(0, 10), today.value)} ${r.at.slice(11, 16)}${end}`;
});

const issue = computed<Issue | null>(() => {
  if (peek.value?.kind !== 'issue') return null;
  const id = peek.value.id;
  return issues.value.find((i) => i.id === id && !i.archived) ?? issues.value.find((i) => i.id === id) ?? null;
});
const origins = computed(() => (issue.value ? issueOrigins(issue.value, allRoutines.value, issues.value) : null));

const project = computed(() => {
  const p = peek.value;
  return p?.kind === 'project' ? projects.value.find((x) => x.slug === p.slug) ?? null : null;
});
const projectIssues = computed(() => (project.value ? issues.value.filter((i) => i.project === project.value!.slug && !i.archived) : []));
const projectOpen = computed(() =>
  projectIssues.value
    .filter((i) => !isClosed(i.status))
    .sort((a, b) => Number(b.status === 'in-review') - Number(a.status === 'in-review') || b.id.localeCompare(a.id)),
);
const md = (text: string) => linkifyIssueRefs(marked.parse(text, { gfm: true, breaks: false }) as string, (id) => liveById.value.has(id));

const routine = computed(() => {
  const p = peek.value;
  return p?.kind === 'routine' ? allRoutines.value.find((r) => r.slug === p.slug) ?? null : null;
});
const routineRuns = computed(() => (routine.value ? newestFirst(routine.value.runs) : []));

const label = computed(() => {
  switch (peek.value?.kind) {
    case 'run':
      return 'Run preview';
    case 'issue':
      return 'Issue preview';
    case 'project':
      return 'Project preview';
    default:
      return 'Routine preview';
  }
});
const missing = computed(() => !!peek.value && !run.value && !issue.value && !project.value && !routine.value);
// Routines arrive after the workspace data; don't call a run missing before.
const loading = computed(() => (peek.value?.kind === 'run' || peek.value?.kind === 'routine') && routines.value === null);

const boardLink = computed(() => {
  const ws = workspaceId.value;
  const p = peek.value;
  if (!p) return null;
  if (p.kind === 'run' || p.kind === 'routine') return `/w/${ws}/routines/${encodeURIComponent(p.slug)}`;
  if (p.kind === 'issue' && issue.value) return `/w/${ws}/issues/${p.id}${issue.value.archived ? '?archived=1' : ''}`;
  return null;
});
function openInBoard() {
  if (peek.value?.kind === 'project') {
    emit('open-project', peek.value.slug);
    return;
  }
  if (boardLink.value) void router.push(boardLink.value);
}

function copyLink() {
  if (peek.value) void copyWithToast(new URL(nav.href(peek.value), window.location.origin).href, 'Link copied');
}

function onProseClick(e: MouseEvent) {
  // The issue view handles its own body's references.
  const ref = e.target instanceof Element && !e.target.closest('.issue-view') ? e.target.closest('button.issue-ref[data-ref]') : null;
  const id = ref?.getAttribute('data-ref');
  if (id) nav.open({ kind: 'issue', id });
}

// Each preview starts at its top, with the keyboard on the dialog so Esc
// works after Back removed the focused button.
const scroller = ref<HTMLElement | null>(null);
watch(peek, async () => {
  await nextTick();
  scroller.value?.scrollTo({ top: 0 });
  const dialog = scroller.value?.closest<HTMLElement>('.modal');
  if (dialog && !dialog.contains(document.activeElement)) dialog.focus();
});
</script>

<template>
  <BaseDialog :open="!!peek" :label="label" preview @close="nav.close()">
    <header class="pv-bar">
      <button v-if="nav.canGoBack.value" type="button" class="ghost pv-btn" title="Back" aria-label="Back" @click="nav.back()">
        <ArrowLeft :size="15" aria-hidden="true" />
      </button>
      <span class="pv-crumb">
        <template v-if="run">Run · {{ run.routine.title }}</template>
        <template v-else-if="issue">#{{ issue.id }}<ProjectBadge v-if="issue.project" :slug="issue.project" /></template>
        <template v-else-if="project">Project</template>
        <template v-else-if="routine">Routine</template>
      </span>
      <span class="pv-gap" />
      <button type="button" class="ghost pv-btn" title="Copy link" @click="copyLink">
        <Link2 :size="15" aria-hidden="true" /> Copy link
      </button>
      <button v-if="(boardLink || project) && !missing" type="button" class="ghost pv-btn" title="Open in board" @click="openInBoard">
        <SquareArrowOutUpRight :size="14" aria-hidden="true" /> Open in board
      </button>
      <button type="button" class="ghost pv-btn" title="Close (Esc)" aria-label="Close" @click="nav.close()">
        <X :size="16" aria-hidden="true" />
      </button>
    </header>

    <div ref="scroller" class="pv-scroll" @click="onProseClick">
      <template v-if="run">
        <h2 class="pv-title">{{ runSummary(run.run) || run.routine.title }}</h2>
        <div class="pv-props">
          <RunTag :status="run.run.status" />
          <span>{{ runWhen }}</span>
          <span v-if="runDuration(run.run)">{{ runDuration(run.run) }}</span>
          <span v-if="run.run.host" class="pv-mono">{{ run.run.host }}</span>
          <span v-if="run.routine.kind === 'issue'">files an issue</span>
        </div>
        <section v-if="runIssues.filed.length || runIssues.mentioned.length" class="pv-box" aria-label="Issues from this run">
          <h3>Issues from this run</h3>
          <IssueLine v-for="i in runIssues.filed" :key="i.id" :issue="i"><span class="pv-how filed">Filed</span><ProjectBadge v-if="i.project" :slug="i.project" /></IssueLine>
          <IssueLine v-for="i in runIssues.mentioned" :key="i.id" :issue="i"><span class="pv-how">Mentioned</span><ProjectBadge v-if="i.project" :slug="i.project" /></IssueLine>
        </section>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="runBody" class="pv-prose prose" v-html="runBody" />
        <footer class="pv-runs">
          <PeekLink v-if="run.older" class="pv-step" :to="{ kind: 'run', slug: run.routine.slug, key: runKey(run.older) }">
            <ChevronLeft :size="14" aria-hidden="true" /> Older
          </PeekLink>
          <span class="pv-gap" />
          <RunStrip :routine="run.routine" :runs="newestFirst(run.routine.runs).slice(0, 21).reverse()" :current="run.run" />
          <span class="pv-gap" />
          <PeekLink v-if="run.newer" class="pv-step" :to="{ kind: 'run', slug: run.routine.slug, key: runKey(run.newer) }">
            Newer <ChevronRight :size="14" aria-hidden="true" />
          </PeekLink>
        </footer>
      </template>

      <template v-else-if="issue">
        <section v-if="origins && (origins.filedBy || origins.mentionedIn.length)" class="pv-box" aria-label="Where this issue came from">
          <template v-if="origins.filedBy">
            <h3>Filed by a routine</h3>
            <PeekLink class="pv-origin" :to="{ kind: 'run', slug: origins.filedBy.routine.slug, key: origins.filedBy.link }">
              <RunDot :tone="origins.filedBy.tone" />
              <span>{{ origins.filedBy.routine.title }} · {{ dayLabel(origins.filedBy.day, today) }} {{ origins.filedBy.time }}</span>
              <span class="pv-origin-sum">{{ origins.filedBy.summary }}</span>
            </PeekLink>
          </template>
          <template v-if="origins.mentionedIn.length">
            <h3>Mentioned in runs</h3>
            <PeekLink v-for="m in origins.mentionedIn.slice(0, 4)" :key="m.key" class="pv-origin" :to="{ kind: 'run', slug: m.routine.slug, key: m.link }">
              <RunDot :tone="m.tone" />
              <span>{{ m.routine.title }} · {{ dayLabel(m.day, today) }} {{ m.time }}</span>
            </PeekLink>
          </template>
        </section>
        <IssueView :issue="issue" layout="panel" />
      </template>

      <template v-else-if="project">
        <h2 class="pv-title">{{ project.title }}</h2>
        <div class="pv-props">
          <ProjectBadge :slug="project.slug" />
          <span>{{ project.status }}</span>
          <span>{{ projectOpen.length }} open · {{ projectIssues.length - projectOpen.length }} done</span>
          <span v-if="project.lastSession">Last session {{ dayLabel(project.lastSession, today) }}</span>
        </div>
        <template v-if="project.focus">
          <h3 class="pv-h">Current focus</h3>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="pv-prose prose" v-html="md(project.focus)" />
        </template>
        <section v-if="projectOpen.length" class="pv-box" aria-label="Open issues">
          <h3>Open issues</h3>
          <IssueLine v-for="i in projectOpen.slice(0, 8)" :key="i.id" :issue="i"><span>{{ COLUMN_LABEL[i.status] }}</span></IssueLine>
        </section>
        <template v-if="project.sessions.length">
          <h3 class="pv-h">Sessions</h3>
          <div v-for="s in project.sessions.slice(0, 3)" :key="s.date" class="pv-session">
            <strong>{{ dayLabel(s.date, today) }}</strong>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="pv-prose prose" v-html="md(s.note)" />
          </div>
        </template>
      </template>

      <template v-else-if="routine">
        <h2 class="pv-title">{{ routine.title }}</h2>
        <div class="pv-props">
          <span>{{ routine.words }}</span>
          <span>{{ routine.enabled && routine.state !== 'paused' ? `Next ${nextSlotText(routine, now())}` : 'Paused' }}</span>
          <span v-if="routine.kind === 'issue'">files an issue each period</span>
          <span class="pv-mono">{{ routine.slug }}</span>
        </div>
        <RunStrip :routine="routine" :runs="routineRuns.slice(0, 30).reverse()" />
        <h3 class="pv-h">Runs</h3>
        <p v-if="!routineRuns.length" class="pv-empty">No runs yet.</p>
        <PeekLink v-for="r in routineRuns.slice(0, 12)" :key="r.at" class="pv-run" :to="{ kind: 'run', slug: routine.slug, key: runKey(r) }">
          <RunTag :status="r.status" />
          <span class="pv-run-when">{{ routineWhen(r.at, routine, now()) }}</span>
          <span class="pv-run-sum">{{ runSummary(r) }}</span>
        </PeekLink>
      </template>

      <p v-else-if="loading" class="pv-empty">Loading…</p>
      <template v-else-if="missing">
        <h2 class="pv-title">Nothing here</h2>
        <p class="pv-empty">This link points to something that isn’t in this workspace anymore.</p>
      </template>
    </div>
  </BaseDialog>
</template>

<style scoped>
.pv-bar { display: flex; align-items: center; gap: 2px; padding: 8px 10px 8px 16px; border-bottom: 1px solid var(--border-subtle); }
.pv-crumb { display: inline-flex; align-items: center; gap: 8px; min-width: 0; overflow: hidden; white-space: nowrap; font-size: 12px; color: var(--text-3); }
.pv-gap { flex: 1; }
.pv-btn { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 8px; font-size: 12px; }
.pv-scroll { overflow-y: auto; padding: 18px 22px 22px; }
.pv-title { margin: 0 0 8px; font-size: 17px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.35; }
.pv-props { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-bottom: 14px; font-size: 12px; color: var(--text-3); }
.pv-mono { font-family: var(--mono); }
.pv-box { margin: 14px 0; padding: 6px 14px; border: 1px solid var(--border); border-radius: var(--r-lg); }
.pv-box h3, .pv-h { margin: 8px 0 4px; font-size: 11px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; }
.pv-h { margin-top: 18px; }
.pv-how { padding: 0 6px; border-radius: var(--r-sm); background: var(--bg-active); color: var(--text-3); font-size: 11px; font-weight: 600; line-height: 18px; }
.pv-how.filed { background: var(--green-soft); color: var(--green-text); }
.pv-prose { font-size: 14px; line-height: 1.6; color: var(--text-2); }
.pv-origin { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 6px 8px; margin: 0 -8px; border-radius: var(--r); color: var(--text); text-decoration: none; }
.pv-origin:hover { background: var(--bg-hover); }
.pv-origin-sum { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-3); font-size: 12px; }
.pv-runs { display: flex; align-items: center; gap: 10px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border-subtle); }
.pv-step { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-3); text-decoration: none; }
.pv-step:hover { color: var(--text); }
.pv-session { margin: 10px 0; }
.pv-session strong { font-size: 12.5px; }
.pv-run { display: grid; grid-template-columns: auto 130px minmax(0, 1fr); align-items: center; gap: 10px; padding: 6px 8px; margin: 0 -8px; border-radius: var(--r); color: var(--text-2); text-decoration: none; }
.pv-run:hover { background: var(--bg-hover); }
.pv-run-when { font-size: 12px; color: var(--text-3); }
.pv-run-sum { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pv-empty { color: var(--text-4); font-size: 13px; }
@media (max-width: 760px) {
  .pv-run { grid-template-columns: auto minmax(0, 1fr); }
  .pv-run-sum { grid-column: 1 / -1; }
}
</style>
