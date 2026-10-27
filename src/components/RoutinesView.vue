<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { marked } from 'marked';
import { ArrowLeft, CalendarClock, FilePlus2 } from '@lucide/vue';
import { formatWhen, systemTimeZone } from '../../shared/cron';
import { firstProblem, newestFirst, RUN_LABEL, runDuration, runTone, stateLabel } from '../routines';
import type { RoutineSummary, Run } from '../types';
import { useWorkspace } from '../workspace';

// The Routines view (#0120): a read-only list of the harness's routines and a
// page per routine with its settings, steps and runs.
const props = defineProps<{ slug: string | null }>();
const router = useRouter();
const { id: workspaceId, routines: data } = useWorkspace();

const zone = systemTimeZone();
const now = computed(() => (data.value ? Date.parse(data.value.now) || Date.now() : Date.now()));
const routines = computed(() => data.value?.routines ?? []);
const current = computed(() => (props.slug ? routines.value.find((r) => r.slug === props.slug) ?? null : null));

function when(iso: string | null | undefined, r: RoutineSummary): string {
  return iso ? formatWhen(Date.parse(iso), r.timezone, now.value) : '—';
}

function scheduleText(r: RoutineSummary): string {
  if (r.state === 'invalid') return '—';
  return r.timezone === zone ? r.words : `${r.words} · ${r.timezone}`;
}

function nextText(r: RoutineSummary): string {
  if (r.state === 'invalid' || r.state === 'paused') return '—';
  if (r.state === 'due' && r.slot) return `Due since ${when(r.slot, r)}`;
  if (r.state === 'running' && r.lastRun) return `Running since ${when(r.lastRun.at, r)}`;
  return r.next ? when(r.next, r) : '—';
}

// The schedule and the next slot on one line, for a narrow pane.
function narrowText(r: RoutineSummary): string {
  if (r.state === 'invalid') return '';
  const next = nextText(r);
  if (r.state === 'paused' || next === '—') return scheduleText(r);
  const lead = r.state === 'due' || r.state === 'running' ? next.charAt(0).toLowerCase() + next.slice(1) : `next ${next}`;
  return `${scheduleText(r)} · ${lead}`;
}

function open(r: RoutineSummary) {
  void router.push(`/w/${workspaceId.value}/routines/${encodeURIComponent(r.slug)}`);
}

function back() {
  void router.push(`/w/${workspaceId.value}/routines`);
}

const stepsHtml = computed(() => (current.value?.body ? (marked.parse(current.value.body, { gfm: true }) as string) : ''));
const RUNS_SHOWN = 30;
const allRuns = ref(false);
watch(() => props.slug, () => (allRuns.value = false));
const runs = computed(() => (current.value ? newestFirst(current.value.runs) : []));
const shownRuns = computed(() => (allRuns.value ? runs.value : runs.value.slice(0, RUNS_SHOWN)));

function noteHtml(run: Run): string {
  return run.note ? (marked.parse(run.note, { gfm: true, breaks: true }) as string) : '';
}

function runMeta(run: Run, r: RoutineSummary): string {
  const parts: string[] = [];
  if (run.status === 'missed' && run.from && run.to) parts.push(`${run.slots ?? ''} ${run.slots === 1 ? 'slot' : 'slots'} from ${when(run.from, r)} to ${when(run.to, r)}`.trim());
  else if (run.slot && when(run.slot, r) !== when(run.at, r)) parts.push(`slot ${when(run.slot, r)}`);
  else if (run.slot) parts.push('on time');
  else if (run.status !== 'expired') parts.push('manual run');
  const took = runDuration(run);
  if (took && run.status !== 'aborted') parts.push(took);
  if (run.host) parts.push(run.host);
  return parts.join(' · ');
}

const settings = computed(() => {
  const r = current.value;
  if (!r) return [];
  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: r.at ? 'Once at' : 'Schedule', value: r.at ?? r.schedule ?? '—', mono: true },
    { label: 'Time zone', value: r.timezone },
    { label: 'Next slot', value: nextText(r) },
    { label: 'Expires after', value: r.expiresAfter ?? 'never — a late slot still runs' },
    { label: 'Timeout', value: r.timeout },
    { label: 'Runs on', value: r.host ?? 'any machine' },
  ];
  if (r.writesTo.length) rows.push({ label: 'Writes to', value: r.writesTo.join(', '), mono: true });
  if (r.creates) {
    rows.push({ label: 'Files', value: `${r.creates.title} — each ${r.creates.period}${r.creates.dueAfter ? `, due ${r.creates.dueAfter} later` : ''}` });
  }
  if (r.created) rows.push({ label: 'Created', value: r.created });
  rows.push({ label: 'Folder', value: r.dir, mono: true });
  return rows;
});
</script>

<template>
  <section v-if="!props.slug" class="routines-view" aria-label="Routines">
    <header class="routines-head">
      <h2>Routines</h2>
      <span class="routines-count">{{ routines.length }}</span>
    </header>
    <div class="routines-scroll">
      <slot name="graph" />
      <p v-if="data && !routines.length" class="list-empty routines-empty">
        No routines yet. Ask your agent to “create a routine that …” — each one is a folder in
        <code>.agents/scheduled/</code>, and one dispatcher runs whatever is due.
      </p>
      <div v-if="routines.length" class="routine-cols" aria-hidden="true">
        <span>Routine</span><span>Schedule</span><span>Next</span><span>Last run</span>
      </div>
      <button v-for="r in routines" :key="r.slug" type="button" class="routine-row" :class="{ muted: r.state === 'paused' }" @click="open(r)">
        <span class="routine-row-main">
          <span class="routine-row-title">
            <component :is="r.kind === 'issue' ? FilePlus2 : CalendarClock" :size="14" class="routine-kind" aria-hidden="true" />
            {{ r.title }}
            <span v-if="stateLabel(r)" class="routine-state" :class="r.state">{{ stateLabel(r) }}</span>
          </span>
          <span v-if="firstProblem(r)" class="routine-problem" :class="r.state === 'invalid' ? 'error' : 'warning'">{{ firstProblem(r) }}</span>
          <span v-else class="routine-row-slug">{{ r.slug }}{{ r.kind === 'issue' ? ' · files an issue' : '' }}</span>
          <span v-if="narrowText(r)" class="routine-row-narrow">{{ narrowText(r) }}</span>
        </span>
        <span class="routine-row-cell wide">{{ scheduleText(r) }}</span>
        <span class="routine-row-cell wide">{{ nextText(r) }}</span>
        <span class="routine-row-cell routine-row-last">
          <template v-if="r.lastRun && r.lastRun.status !== 'running'">
            <span class="run-dot" :class="runTone(r.lastRun.status)" aria-hidden="true" />{{ RUN_LABEL[r.lastRun.status] }} · {{ when(r.lastRun.at, r) }}
          </template>
          <template v-else>—</template>
        </span>
      </button>
    </div>
  </section>

  <section v-else class="routines-view" aria-label="Routine">
    <header class="routines-head">
      <button type="button" class="ghost routine-back" aria-label="Back to routines" title="Routines" @click="back">
        <ArrowLeft :size="15" aria-hidden="true" />
      </button>
      <h2>{{ current?.title ?? props.slug }}</h2>
      <span v-if="current && stateLabel(current)" class="routine-state" :class="current.state">{{ stateLabel(current) }}</span>
    </header>
    <div class="routines-scroll">
      <p v-if="data && !current" class="list-empty">No routine “{{ props.slug }}” in this workspace.</p>
      <div v-if="current" class="routine-page">
        <p class="routine-words">{{ scheduleText(current) }}</p>
        <ul v-if="current.problems.length" class="routine-problems">
          <li v-for="(p, i) in current.problems" :key="i" :class="p.level">{{ p.file }}: {{ p.message }}</li>
        </ul>
        <slot name="graph" />
        <dl class="routine-settings">
          <template v-for="row in settings" :key="row.label">
            <dt>{{ row.label }}</dt>
            <dd :class="{ mono: row.mono }">{{ row.value }}</dd>
          </template>
        </dl>
        <h3 class="routine-sec">Steps</h3>
        <div v-if="stepsHtml" class="prose routine-steps" v-html="stepsHtml" />
        <p v-else class="list-empty">No steps.</p>
        <h3 class="routine-sec">Runs <span>{{ runs.length }}</span></h3>
        <p v-if="!runs.length" class="list-empty">No runs yet.</p>
        <ol v-else class="routine-runs">
          <li v-for="run in shownRuns" :key="`${run.status}-${run.at}`" class="routine-run">
            <div class="routine-run-head">
              <span class="run-dot" :class="runTone(run.status)" aria-hidden="true" />
              <span class="routine-run-status">{{ RUN_LABEL[run.status] }}</span>
              <span class="routine-run-when">{{ when(run.at, current) }}</span>
              <span class="routine-run-meta">{{ runMeta(run, current) }}</span>
            </div>
            <div v-if="run.note" class="prose routine-run-note" v-html="noteHtml(run)" />
          </li>
        </ol>
        <button v-if="runs.length > shownRuns.length" type="button" class="ghost routine-more" @click="allRuns = true">Show all {{ runs.length }} runs</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.routines-view { display: flex; flex-direction: column; height: 100%; min-height: 0; container-type: inline-size; }
.routines-head { display: flex; align-items: center; gap: 8px; height: 52px; padding: 0 20px; border-bottom: 1px solid var(--border-subtle); flex: 0 0 auto; }
.routines-head h2 { margin: 0; font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.routines-count { font-size: 13px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.routine-back { width: 28px; height: 28px; padding: 0; justify-content: center; margin-left: -6px; }
.routines-scroll { flex: 1; overflow-y: auto; padding-bottom: 40px; }
.routines-empty code { font: 0.92em var(--mono); }
.routine-cols, .routine-row {
  display: grid;
  grid-template-columns: minmax(200px, 1.4fr) minmax(0, 1fr) 150px 160px;
  align-items: center;
  gap: 20px;
  width: 100%;
  padding: 11px 20px;
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  background: transparent;
  font-weight: 400;
  text-align: left;
}
.routine-cols { padding: 8px 20px 6px; border-bottom: 1px solid var(--border-subtle); font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-3); }
.routine-row:hover { background: var(--bg-hover); }
.routine-row-narrow { display: none; font-size: 12px; color: var(--text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@container (max-width: 860px) {
  .routine-cols, .routine-row { grid-template-columns: minmax(0, 1fr) 150px; }
  .routine-cols span:nth-child(2), .routine-cols span:nth-child(3), .routine-row-cell.wide { display: none; }
  .routine-row-narrow { display: block; }
}
.routine-row.muted .routine-row-title { color: var(--text-3); }
.routine-row-main { display: grid; gap: 3px; min-width: 0; }
.routine-row-title { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 500; color: var(--text); min-width: 0; }
.routine-kind { color: var(--text-3); flex: 0 0 auto; }
.routine-row-slug { font: 11.5px var(--mono); color: var(--text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.routine-row-cell { font-size: 12.5px; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.routine-row-last { display: flex; align-items: center; gap: 6px; }
.routine-state { display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: 999px; background: var(--bg-active); color: var(--text-2); font-size: 11px; font-weight: 500; }
.routine-state.due { background: var(--accent-soft); color: var(--accent-text); }
.routine-state.invalid { background: var(--red-soft); color: var(--red-text); }
.routine-problem { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.routine-problem.error, .routine-problems .error { color: var(--red-text); }
.routine-problem.warning, .routine-problems .warning { color: var(--text-3); }
.run-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; background: var(--run-missed); }
.run-dot.ok { background: var(--run-ok); }
.run-dot.failed { background: var(--run-failed); }
.run-dot.running { background: var(--run-running); }
.routine-page { max-width: 860px; padding: 18px 20px 0; }
.routine-words { margin: 0 0 14px; font-size: 14px; color: var(--text-2); }
.routine-problems { margin: 0 0 14px; padding-left: 18px; font-size: 12.5px; }
.routine-settings { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 6px 16px; margin: 0 0 8px; font-size: 13px; }
.routine-settings dt { color: var(--text-3); }
.routine-settings dd { margin: 0; color: var(--text); overflow-wrap: anywhere; }
.routine-settings dd.mono { font: 12px var(--mono); padding-top: 1px; }
.routine-sec { display: flex; align-items: center; gap: 8px; margin: 26px 0 10px; font-size: 13px; font-weight: 600; }
.routine-sec span { color: var(--text-3); font-weight: 400; }
.routine-steps { font-size: 14px; }
.routine-runs { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--border-subtle); }
.routine-run { padding: 10px 0; border-bottom: 1px solid var(--border-subtle); }
.routine-run-head { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.routine-run-status { font-weight: 500; }
.routine-run-when { color: var(--text-2); }
.routine-run-meta { color: var(--text-3); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.routine-run-note { margin: 4px 0 0 16px; font-size: 13px; color: var(--text-2); }
.routine-more { margin-top: 8px; }
</style>
