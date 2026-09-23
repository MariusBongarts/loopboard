<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import {
  SCENARIO_STATUS_GLYPH,
  SCENARIO_STATUS_LABEL,
  type Scenario,
} from '../types';

const props = defineProps<{ scenario: Scenario }>();

const renderedBody = computed(() => {
  if (!props.scenario.body) return '';
  return marked.parse(props.scenario.body, { gfm: true, breaks: false }) as string;
});

const renderedNotes = computed(() => {
  if (!props.scenario.notes) return '';
  return marked.parseInline(props.scenario.notes, { gfm: true }) as string;
});
</script>

<template>
  <article class="spec-scenario">
    <header class="spec-scenario-head">
      <h3 class="spec-scenario-title">{{ scenario.title }}</h3>
      <span
        class="spec-scenario-pill"
        :class="`status-${scenario.status}`"
        :title="SCENARIO_STATUS_LABEL[scenario.status]"
      >
        <span class="glyph">{{ SCENARIO_STATUS_GLYPH[scenario.status] }}</span>
        <span class="label">{{ SCENARIO_STATUS_LABEL[scenario.status] }}</span>
      </span>
    </header>
    <p
      v-if="scenario.notes"
      class="spec-scenario-notes"
      v-html="renderedNotes"
    />
    <div class="spec-scenario-body" v-html="renderedBody" />
  </article>
</template>
