<script setup lang="ts">
import { runKey } from '../../home';
import { RUN_LABEL, runTone } from '../../routines';
import type { RoutineSummary, Run } from '../../types';
import PeekLink from './PeekLink.vue';

// A routine's recent runs as ticks, oldest first; each opens its run (#0129).
const props = defineProps<{ routine: RoutineSummary; runs: Run[]; current?: Run | null }>();
</script>

<template>
  <span class="run-strip" :aria-label="`Last ${props.runs.length} runs of ${props.routine.title}`">
    <PeekLink
      v-for="run in props.runs"
      :key="run.at"
      class="run-tick"
      :class="[runTone(run.status), { current: run === props.current }]"
      :to="{ kind: 'run', slug: props.routine.slug, key: runKey(run) }"
      :title="`${run.at.slice(0, 10)} ${run.at.slice(11, 16)} · ${RUN_LABEL[run.status]}`"
      :aria-label="`${run.at.slice(0, 10)} ${run.at.slice(11, 16)} ${RUN_LABEL[run.status]}`"
    />
  </span>
</template>

<style scoped>
.run-strip { display: inline-flex; align-items: center; gap: 3px; }
.run-tick { width: 7px; height: 14px; border-radius: 2px; background: color-mix(in oklch, var(--run-missed) 45%, transparent); transition: transform var(--dur) var(--ease); }
.run-tick.ok { background: var(--run-ok); }
.run-tick.failed { background: var(--run-failed); }
.run-tick.running { background: var(--run-running); }
.run-tick:hover { transform: scaleY(1.25); }
.run-tick.current { outline: 2px solid var(--text); outline-offset: 1px; }
</style>
