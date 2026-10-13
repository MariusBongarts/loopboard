<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import SpecTOC from './SpecTOC.vue';
import { readWorkspaceStored, writeWorkspaceStored } from '../storage';
import { useWorkspace } from '../workspace';
import { useRoute } from 'vue-router';
import SpecSection from './SpecSection.vue';
import DocEditor from './DocEditor.vue';
import {
  SCENARIO_STATUS_GLYPH,
  SCENARIO_STATUS_LABEL,
  SCENARIO_STATUSES,
  aggregateCoverage,
  scenarioMatches,
  tokenizeQuery,
  type Scenario,
  type ScenarioStatus,
  type Spec,
} from '../types';

// `loaded` tells a workspace without specs from one still loading (#0078).
const props = defineProps<{ specs: Spec[]; loaded?: boolean }>();

const SELECTED_KEY = 'specs.selectedId';
const STATUS_KEY = 'specs.enabledStatuses';
const { id: workspaceId } = useWorkspace();
const route = useRoute();

const selectedId = ref<string | null>(null);
// Specs are editable in place (#0027); coverage recomputes from live data.
const editing = ref(false);
watch(selectedId, () => (editing.value = false));
const rawQuery = ref('');
const debouncedQuery = ref('');
const enabledStatuses = ref<Set<ScenarioStatus>>(new Set(SCENARIO_STATUSES));
const searchInput = ref<HTMLInputElement | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(rawQuery, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = val;
  }, 80);
});

onMounted(() => {
  const savedId = readWorkspaceStored(workspaceId.value, SELECTED_KEY);
  if (!route.query.spec && savedId && props.specs.some((s) => s.id === savedId)) {
    selectedId.value = savedId;
  }
  try {
    const saved = readWorkspaceStored(workspaceId.value, STATUS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as ScenarioStatus[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        enabledStatuses.value = new Set(
          parsed.filter((s): s is ScenarioStatus =>
            (SCENARIO_STATUSES as readonly string[]).includes(s),
          ),
        );
      }
    }
  } catch { /* invalid JSON */ }
});

// ⌘K opens a spec with ?spec=<id> (#0021).
watch(
  () => route.query.spec,
  (spec) => {
    if (typeof spec === 'string' && props.specs.some((s) => s.id === spec)) selectedId.value = spec;
  },
  { immediate: true },
);

watch(selectedId, (id) => {
  if (id) writeWorkspaceStored(workspaceId.value, SELECTED_KEY, id);
});

watch(enabledStatuses, (set) => {
  writeWorkspaceStored(workspaceId.value, STATUS_KEY, JSON.stringify([...set]));
}, { deep: true });

watch(
  () => props.specs,
  (specs) => {
    if (specs.length === 0) {
      selectedId.value = null;
      return;
    }
    // A ?spec= link wins once the specs have loaded (#0021).
    const wanted = typeof route.query.spec === 'string' ? route.query.spec : null;
    if (wanted && specs.some((s) => s.id === wanted)) {
      selectedId.value = wanted;
      return;
    }
    if (!selectedId.value || !specs.some((s) => s.id === selectedId.value)) {
      const firstWithScenarios = specs.find((s) => s.scenarios.length > 0);
      selectedId.value = (firstWithScenarios ?? specs[0]).id;
    }
  },
  { immediate: true },
);

const queryTokens = computed(() => tokenizeQuery(debouncedQuery.value));
const hasFilters = computed(
  () =>
    queryTokens.value.length > 0 ||
    enabledStatuses.value.size !== SCENARIO_STATUSES.length,
);

function passesFilters(scenario: Scenario): boolean {
  if (!enabledStatuses.value.has(scenario.status)) return false;
  if (queryTokens.value.length > 0 && !scenarioMatches(scenario, queryTokens.value)) {
    return false;
  }
  return true;
}

const matchingIdsSet = computed(() => {
  const ids = new Set<string>();
  for (const spec of props.specs) {
    if (spec.scenarios.some(passesFilters)) ids.add(spec.id);
  }
  return ids;
});

const visibleSpecsForToc = computed(() => {
  if (!hasFilters.value) return props.specs;
  return props.specs.filter((s) => matchingIdsSet.value.has(s.id));
});

watch([matchingIdsSet, () => props.specs], () => {
  if (!hasFilters.value) return;
  if (selectedId.value && matchingIdsSet.value.has(selectedId.value)) return;
  const first = props.specs.find((s) => matchingIdsSet.value.has(s.id));
  if (first) selectedId.value = first.id;
});

const selectedSpec = computed<Spec | null>(() => {
  if (!selectedId.value) return null;
  return props.specs.find((s) => s.id === selectedId.value) ?? null;
});

const visibleScenarios = computed<Scenario[]>(() => {
  if (!selectedSpec.value) return [];
  return selectedSpec.value.scenarios.filter(passesFilters);
});

const aggregate = computed(() => aggregateCoverage(props.specs));
const aggregatePct = computed(() => {
  if (aggregate.value.total === 0) return 0;
  return Math.round((aggregate.value.weighted / aggregate.value.total) * 100);
});

function toggleStatus(status: ScenarioStatus) {
  const next = new Set(enabledStatuses.value);
  if (next.has(status)) {
    if (next.size === 1) return;
    next.delete(status);
  } else {
    next.add(status);
  }
  enabledStatuses.value = next;
}

function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    rawQuery.value = '';
    debouncedQuery.value = '';
  }
}

function clearSearch() {
  rawQuery.value = '';
  debouncedQuery.value = '';
  searchInput.value?.focus();
}

function focusSearch() {
  searchInput.value?.focus();
  searchInput.value?.select();
}

defineExpose({ focusSearch });
</script>

<template>
  <div class="specs-view">
    <header class="specs-header">
      <h2 class="specs-title">Specs</h2>
      <div class="specs-search-wrap">
        <input
          ref="searchInput"
          v-model="rawQuery"
          type="search"
          class="search-input specs-search"
          placeholder="Search scenarios ( / )"
          aria-label="Search spec scenarios"
          @keydown="onSearchKeydown"
        />
        <button
          v-if="rawQuery"
          type="button"
          class="specs-search-clear"
          @click="clearSearch"
        >clear</button>
      </div>
      <nav class="chips chips-status" aria-label="Coverage status filter">
        <button
          v-for="status in SCENARIO_STATUSES"
          :key="status"
          type="button"
          class="chip chip-status"
          :class="[
            { active: enabledStatuses.has(status) },
            `status-${status}`,
          ]"
          :aria-pressed="enabledStatuses.has(status)"
          @click="toggleStatus(status)"
        >
          <span class="glyph">{{ SCENARIO_STATUS_GLYPH[status] }}</span>
          <span>{{ SCENARIO_STATUS_LABEL[status] }}</span>
          <span class="badge">{{ aggregate.counts[status] }}</span>
        </button>
      </nav>
      <div class="specs-aggregate">
        <span class="specs-aggregate-pct">{{ aggregatePct }}%</span>
        <span class="specs-aggregate-eyebrow">covered · {{ aggregate.total }} scenarios</span>
      </div>
    </header>

    <div class="specs-body">
      <SpecTOC
        :specs="specs"
        :selected-id="selectedId"
        :matching-ids="matchingIdsSet"
        :has-filters="hasFilters"
        @select="(id) => (selectedId = id)"
      />
      <main class="spec-pane">
        <DocEditor
          v-if="selectedSpec && editing"
          :path="`specs/${selectedSpec.filename}`"
          :version="JSON.stringify(selectedSpec)"
          @close="editing = false"
        />
        <template v-else-if="selectedSpec">
          <div class="pane-doc-tools"><button type="button" class="spec-edit" @click="editing = true">Edit spec</button></div>
          <SpecSection :spec="selectedSpec" :visible-scenarios="visibleScenarios" :has-filters="hasFilters" />
        </template>
        <div v-else-if="loaded && specs.length === 0" class="spec-pane-empty">
          <p class="eyebrow">No specs</p>
          <h2>This workspace has no specs.</h2>
          <p>Specs are numbered files in the <code>specs/</code> folder next to <code>issues/</code>. A harness without code has none.</p>
        </div>
        <div v-else-if="hasFilters && visibleSpecsForToc.length === 0" class="spec-pane-empty">
          <p class="eyebrow">No matches</p>
          <h2>No scenarios match the current filters.</h2>
          <button class="primary" @click="clearSearch">Clear search</button>
        </div>
        <div v-else class="spec-pane-empty">
          <p>Loading specs…</p>
        </div>
      </main>
    </div>
  </div>
</template>
