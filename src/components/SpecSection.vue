<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import SpecScenario from './SpecScenario.vue';
import {
  SCENARIO_STATUS_GLYPH,
  SCENARIO_STATUS_LABEL,
  specCoverage,
  type Scenario,
  type Spec,
} from '../types';

const props = defineProps<{
  spec: Spec;
  visibleScenarios: Scenario[];
  hasFilters: boolean;
}>();

const renderedPreamble = computed(() => {
  const md = props.spec.preamble.replace(/^#\s+.+\s*$/m, '').trim();
  if (!md) return '';
  return marked.parse(md, { gfm: true, breaks: false }) as string;
});

const stats = computed(() => specCoverage(props.spec));

const pct = computed(() => {
  if (stats.value.total === 0) return 0;
  return Math.round((stats.value.weighted / stats.value.total) * 100);
});
</script>

<template>
  <section class="spec-section">
    <header class="spec-section-head">
      <p class="spec-section-eyebrow">§ {{ spec.id }} · {{ spec.filename }}</p>
      <h2 class="spec-section-title">{{ spec.title }}</h2>
      <div class="spec-section-coverage" v-if="spec.scenarios.length > 0">
        <span class="coverage-pct">{{ pct }}% covered</span>
        <span class="coverage-counts">
          <span class="count count-covered">
            {{ SCENARIO_STATUS_GLYPH.covered }} {{ stats.counts.covered }}
          </span>
          <span class="count count-partial">
            {{ SCENARIO_STATUS_GLYPH.partial }} {{ stats.counts.partial }}
          </span>
          <span class="count count-fixme">
            {{ SCENARIO_STATUS_GLYPH.fixme }} {{ stats.counts.fixme }}
          </span>
          <span class="count count-none">
            {{ SCENARIO_STATUS_GLYPH.none }} {{ stats.counts.none }}
          </span>
        </span>
        <span v-if="!spec.hasTable" class="no-table-tag">
          No coverage table — counted as uncovered
        </span>
      </div>
    </header>

    <div
      v-if="renderedPreamble"
      class="spec-section-preamble"
      v-html="renderedPreamble"
    />

    <div v-if="spec.scenarios.length === 0" class="spec-section-empty">
      <p>No GIVEN/WHEN/THEN scenarios in this section.</p>
    </div>
    <div v-else-if="visibleScenarios.length === 0" class="spec-section-empty">
      <p>
        No scenarios match the current filters
        <span v-if="hasFilters">— try clearing search or toggling a status chip back on.</span>
      </p>
    </div>
    <div v-else class="spec-scenario-list">
      <SpecScenario
        v-for="(s, idx) in visibleScenarios"
        :key="idx"
        :scenario="s"
      />
    </div>
  </section>
</template>
