<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { formatLocal } from '../../shared/cron';
import { dayLabel, graphColumns, longDay, monthLabels, RUN_LABEL, runsOn, runTone } from '../routines';
import type { GraphDay, RoutineSummary } from '../types';

// A GitHub-style contribution graph (#0121): 53 weeks × 7 days, a cell per
// day. Arrow keys move through the days; hovering or focusing one shows its
// runs below the graph.
const props = defineProps<{
  days: GraphDay[];
  today: string;
  routines: RoutineSummary[]; // whose runs a day lists
  label: string;
  showRoutine?: boolean; // name the routine of each run (the workspace graph)
}>();

const columns = computed(() => graphColumns(props.today));
const months = computed(() => monthLabels(columns.value));
const byDate = computed(() => new Map(props.days.map((d) => [d.date, d])));

const lastColumn = computed(() => columns.value.length - 1);
const todayRow = computed(() => columns.value[lastColumn.value].lastIndexOf(props.today));
const focus = ref({ col: lastColumn.value, row: Math.max(0, todayRow.value) });
const shown = ref<string | null>(null);
watch(
  () => props.today,
  () => (focus.value = { col: lastColumn.value, row: Math.max(0, todayRow.value) }),
);

function cellClass(date: string | null): string[] {
  if (!date) return ['future'];
  const d = byDate.value.get(date);
  if (!d) return [];
  return d.state === 'ok' ? ['ok', `l${d.level}`] : [d.state];
}

const grid = ref<HTMLElement | null>(null);
// Today stays in view when the pane is narrower than a year.
const scroller = ref<HTMLElement | null>(null);
onMounted(() => {
  if (scroller.value) scroller.value.scrollLeft = scroller.value.scrollWidth;
});
function move(e: KeyboardEvent) {
  const steps: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const step = steps[e.key] ?? (e.key === 'Home' ? [-focus.value.col, 0] : e.key === 'End' ? [lastColumn.value - focus.value.col, 0] : null);
  if (!step) return;
  e.preventDefault();
  let { col, row } = focus.value;
  col = Math.min(lastColumn.value, Math.max(0, col + step[0]));
  row = Math.min(6, Math.max(0, row + step[1]));
  if (!columns.value[col][row]) return;
  focus.value = { col, row };
  void nextTick(() => grid.value?.querySelector<HTMLElement>('[tabindex="0"]')?.focus());
}

const shownRuns = computed(() => (shown.value ? runsOn(props.routines, shown.value) : []));
const shownDay = computed(() => (shown.value ? byDate.value.get(shown.value) : undefined));
</script>

<template>
  <figure class="graph" :aria-label="props.label">
    <div ref="scroller" class="graph-scroll">
      <div class="graph-inner">
        <div class="graph-months" aria-hidden="true">
          <span v-for="m in months" :key="m.column" :style="{ gridColumn: m.column + 1 }">{{ m.label }}</span>
        </div>
        <div class="graph-body">
          <div class="graph-weekdays" aria-hidden="true"><span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span /><span /></div>
          <div ref="grid" class="graph-grid" role="grid" :aria-label="props.label" @keydown="move" @mouseleave="shown = null">
            <div v-for="row in 7" :key="row" role="row" class="graph-row">
              <template v-for="(days, col) in columns" :key="col">
                <span
                  v-if="days[row - 1]"
                  role="gridcell"
                  class="graph-cell"
                  :class="cellClass(days[row - 1])"
                  :style="{ gridColumn: col + 1, gridRow: row }"
                  :tabindex="focus.col === col && focus.row === row - 1 ? 0 : -1"
                  :aria-label="dayLabel(days[row - 1]!, byDate.get(days[row - 1]!))"
                  :data-date="days[row - 1]"
                  @mouseenter="shown = days[row - 1]"
                  @focus="(focus = { col, row: row - 1 }), (shown = days[row - 1])"
                />
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
    <figcaption class="graph-foot">
      <span class="graph-detail" aria-live="polite">
        <template v-if="shown">
          <strong>{{ longDay(shown) }}</strong>
          <template v-if="!shownRuns.length"> — {{ shownDay?.missed ? 'a slot without a run' : 'nothing ran' }}</template>
          <span v-for="(item, i) in shownRuns.slice(0, 4)" :key="i" class="graph-run">
            <span class="graph-dot" :class="runTone(item.run.status)" aria-hidden="true" />
            <template v-if="props.showRoutine">{{ item.routine.title }} · </template>{{ formatLocal(Date.parse(item.run.at), item.routine.timezone).slice(11) }}
            {{ RUN_LABEL[item.run.status] }}<template v-if="item.run.note"> — {{ item.run.note.split('\n')[0] }}</template>
          </span>
          <span v-if="shownRuns.length > 4" class="graph-more">and {{ shownRuns.length - 4 }} more</span>
        </template>
        <template v-else>Hover or focus a day to see its runs.</template>
      </span>
      <span class="graph-legend" aria-hidden="true">
        Fewer <i class="graph-cell ok l1" /><i class="graph-cell ok l2" /><i class="graph-cell ok l3" /><i class="graph-cell ok l4" /> More
        <i class="graph-cell failed" /> Failed <i class="graph-cell missed" /> Missed
      </span>
    </figcaption>
  </figure>
</template>

<style scoped>
.graph { margin: 0; }
.graph-scroll { overflow-x: auto; padding-bottom: 4px; }
.graph-inner { display: inline-block; }
.graph-months { display: grid; grid-template-columns: repeat(53, 10px); column-gap: 3px; margin-left: 30px; height: 16px; font-size: 11px; color: var(--text-3); }
.graph-months span { white-space: nowrap; }
.graph-body { display: flex; gap: 6px; }
.graph-weekdays { display: grid; grid-template-rows: repeat(7, 10px); row-gap: 3px; width: 24px; font-size: 10px; line-height: 10px; color: var(--text-3); }
.graph-grid { display: grid; grid-template-columns: repeat(53, 10px); grid-template-rows: repeat(7, 10px); gap: 3px; }
.graph-row { display: contents; }
.graph-cell { width: 10px; height: 10px; border-radius: 2px; background: var(--graph-empty); outline: none; }
.graph-cell:focus-visible { box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--focus); }
.graph-cell.ok.l1 { background: var(--graph-1); }
.graph-cell.ok.l2 { background: var(--graph-2); }
.graph-cell.ok.l3 { background: var(--graph-3); }
.graph-cell.ok.l4 { background: var(--graph-4); }
.graph-cell.failed { background: var(--run-failed); }
.graph-cell.missed { background: var(--run-missed); }
.graph-foot { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 6px 16px; margin-top: 8px; font-size: 12px; color: var(--text-3); }
.graph-detail { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 10px; min-height: 18px; min-width: 0; color: var(--text-2); }
.graph-detail strong { font-weight: 600; color: var(--text); }
.graph-run { display: inline-flex; align-items: center; gap: 5px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.graph-dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; background: var(--run-missed); }
.graph-dot.ok { background: var(--run-ok); }
.graph-dot.failed { background: var(--run-failed); }
.graph-dot.running { background: var(--run-running); }
.graph-more { color: var(--text-3); }
.graph-legend { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.graph-legend .graph-cell { display: inline-block; }
.graph-legend .graph-cell.failed, .graph-legend .graph-cell.missed { margin-left: 8px; }
</style>
