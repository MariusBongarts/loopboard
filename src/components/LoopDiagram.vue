<script setup lang="ts">
import { CircleCheck, Compass, FileText, Hammer, Layers, MessagesSquare } from '@lucide/vue';
import { computed, nextTick, ref, type Component } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { LOOP_STEPS, type LoopStep } from '../course';
import Avatar from './Avatar.vue';

// The loop as a diagram you can click (#0063). Steps are tabs around a ring;
// the accent arc shows how far round the loop the selected step is.
const props = defineProps<{ chapterLink: (chapter: string) => RouteLocationRaw }>();

const ICONS: Record<LoopStep['id'], Component> = {
  decide: MessagesSquare,
  plan: FileText,
  slice: Layers,
  build: Hammer,
  verify: CircleCheck,
  steer: Compass,
};

const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const selected = ref(0);
const tabs = ref<HTMLButtonElement[]>([]);
const step = computed(() => LOOP_STEPS[selected.value]);
const arcOffset = computed(() => CIRCUMFERENCE * (1 - selected.value / LOOP_STEPS.length));

function position(i: number) {
  const angle = ((-90 + (i * 360) / LOOP_STEPS.length) * Math.PI) / 180;
  return { left: `${50 + RADIUS * Math.cos(angle)}%`, top: `${50 + RADIUS * Math.sin(angle)}%` };
}

// Chevrons halfway between steps, pointing clockwise.
const chevrons = LOOP_STEPS.map((_, i) => {
  const deg = -90 + ((i + 0.5) * 360) / LOOP_STEPS.length;
  const rad = (deg * Math.PI) / 180;
  return { x: 50 + RADIUS * Math.cos(rad), y: 50 + RADIUS * Math.sin(rad), rotate: deg };
});

function select(i: number, focus = false) {
  selected.value = (i + LOOP_STEPS.length) % LOOP_STEPS.length;
  if (focus) void nextTick(() => tabs.value[selected.value]?.focus());
}

function onKey(e: KeyboardEvent) {
  const moves: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  if (e.key in moves) select(selected.value + moves[e.key], true);
  else if (e.key === 'Home') select(0, true);
  else if (e.key === 'End') select(LOOP_STEPS.length - 1, true);
  else return;
  e.preventDefault();
}
</script>

<template>
  <div class="loop">
    <div class="loop-ring">
      <svg class="loop-svg" viewBox="0 0 100 100" aria-hidden="true">
        <circle class="ring" cx="50" cy="50" :r="RADIUS" />
        <circle
          class="ring-progress"
          cx="50"
          cy="50"
          :r="RADIUS"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="arcOffset"
        />
        <path
          v-for="(c, i) in chevrons"
          :key="i"
          class="chevron"
          d="M -1.4 -1 L 0 0.6 L 1.4 -1"
          :transform="`translate(${c.x} ${c.y}) rotate(${c.rotate})`"
        />
      </svg>
      <p class="loop-center">
        <span>You decide and steer.</span>
        <span>The agent does the rest.</span>
      </p>
      <div class="loop-steps" role="tablist" aria-label="Steps of the loop" @keydown="onKey">
        <button
          v-for="(s, i) in LOOP_STEPS"
          :id="`loop-tab-${s.id}`"
          :key="s.id"
          ref="tabs"
          type="button"
          role="tab"
          class="loop-step"
          :class="{ on: i === selected, done: i < selected }"
          :style="{ ...position(i), '--i': i }"
          :aria-selected="i === selected"
          :aria-controls="`loop-panel`"
          :tabindex="i === selected ? 0 : -1"
          @click="select(i)"
        >
          <component :is="ICONS[s.id]" :size="15" aria-hidden="true" />
          {{ s.title }}
        </button>
      </div>
    </div>

    <div id="loop-panel" class="loop-panel" role="tabpanel" :aria-labelledby="`loop-tab-${step.id}`">
      <Transition name="loop-swap" mode="out-in">
        <div :key="step.id">
          <p class="loop-meta">
            Step {{ selected + 1 }} of {{ LOOP_STEPS.length }}
            <span class="loop-who"><Avatar :assignee="step.who" :size="16" /> {{ step.who === 'human' ? 'You' : 'Agent' }}</span>
          </p>
          <h3>{{ step.title }}</h3>
          <p class="loop-detail">{{ step.detail }}</p>
          <dl class="loop-facts">
            <dt>You say</dt>
            <dd class="loop-say">{{ step.say.startsWith('nothing') ? step.say : `“${step.say}”` }}</dd>
            <dt>Skill</dt>
            <dd><code>{{ step.skill }}</code></dd>
            <dt>Result</dt>
            <dd>{{ step.result }}</dd>
          </dl>
          <RouterLink class="loop-more" :to="props.chapterLink(step.chapter)">Read the chapter →</RouterLink>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.loop { display: grid; grid-template-columns: minmax(0, 420px) minmax(0, 1fr); gap: 36px; align-items: center; }
.loop-ring { position: relative; width: 100%; aspect-ratio: 1; }
.loop-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.ring { fill: none; stroke: var(--border); stroke-width: 0.5; }
.ring-progress {
  fill: none; stroke: var(--accent); stroke-width: 0.7; stroke-linecap: round;
  transform: rotate(-90deg); transform-origin: 50px 50px;
  transition: stroke-dashoffset 420ms var(--ease);
  animation: draw 900ms var(--ease) both;
}
.chevron { fill: none; stroke: var(--text-4); stroke-width: 0.45; stroke-linecap: round; stroke-linejoin: round; }
.loop-center {
  position: absolute; inset: 34%; margin: 0; display: grid; place-content: center; gap: 2px;
  text-align: center; font-size: 12.5px; line-height: 1.45; color: var(--text-3);
}
.loop-center span:first-child { color: var(--text-2); font-weight: 500; }
.loop-step {
  position: absolute; translate: -50% -50%;
  display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 13px;
  border: 1px solid var(--border); border-radius: 999px; background: var(--surface); box-shadow: var(--shadow-sm);
  font-size: 13px; font-weight: 500; color: var(--text-2); white-space: nowrap;
  transition: border-color var(--dur) var(--ease), background var(--dur) var(--ease), color var(--dur) var(--ease);
  animation: appear 420ms var(--ease) both; animation-delay: calc(var(--i) * 70ms + 150ms);
}
.loop-step:hover { border-color: var(--border-strong); color: var(--text); }
.loop-step svg { color: var(--text-3); }
.loop-step.done { color: var(--text); }
.loop-step.done svg { color: var(--accent-text); }
.loop-step.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-text); }
.loop-step.on svg { color: var(--accent-text); }

.loop-panel { min-height: 300px; padding: 22px 24px; border: 1px solid var(--border); border-radius: var(--r-xl); background: var(--surface); box-shadow: var(--shadow); }
.loop-meta { display: flex; align-items: center; justify-content: space-between; margin: 0 0 6px; font-size: 12px; color: var(--text-3); }
.loop-who { display: inline-flex; align-items: center; gap: 6px; }
.loop-panel h3 { margin: 0 0 8px; font-size: 20px; font-weight: 600; letter-spacing: -0.015em; }
.loop-detail { margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: var(--text-2); }
.loop-facts { display: grid; grid-template-columns: 70px minmax(0, 1fr); gap: 8px 12px; margin: 0 0 16px; font-size: 13px; }
.loop-facts dt { color: var(--text-3); }
.loop-facts dd { margin: 0; color: var(--text); overflow-wrap: anywhere; }
.loop-facts code { font-family: var(--mono); font-size: 12px; padding: 1px 6px; border-radius: var(--r-sm); background: var(--accent-soft); color: var(--accent-text); }
.loop-say { font-weight: 500; }
.loop-more { font-size: 13px; color: var(--accent-text); text-decoration: none; }
.loop-more:hover { text-decoration: underline; }
.loop-swap-enter-active, .loop-swap-leave-active { transition: opacity var(--dur) var(--ease), translate var(--dur) var(--ease); }
.loop-swap-enter-from { opacity: 0; translate: 0 4px; }
.loop-swap-leave-to { opacity: 0; }

@keyframes appear { from { opacity: 0; scale: 0.94; } }
@keyframes draw { from { stroke-dashoffset: 238.76; } }
@media (prefers-reduced-motion: reduce) {
  .loop-step, .ring-progress { animation: none; }
  .ring-progress { transition: none; }
}
@media (max-width: 820px) {
  .loop { grid-template-columns: minmax(0, 1fr); justify-items: center; gap: 24px; }
  .loop-ring { max-width: 380px; }
  .loop-panel { width: 100%; }
}
@media (max-width: 420px) {
  .loop-step { height: 30px; padding: 0 10px; font-size: 12px; gap: 5px; }
  .loop-center { font-size: 11.5px; }
}
</style>
