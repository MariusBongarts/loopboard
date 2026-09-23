<script setup lang="ts">
import { computed } from 'vue';
import { specCoverage, type Spec } from '../types';

const props = defineProps<{
  specs: Spec[];
  selectedId: string | null;
  matchingIds: Set<string>;
  hasFilters: boolean;
}>();

defineEmits<{
  (e: 'select', id: string): void;
}>();

interface TOCRow {
  id: string;
  title: string;
  filename: string;
  pct: number;
  total: number;
  weighted: number;
  hidden: boolean;
}

const rows = computed<TOCRow[]>(() => {
  return props.specs.map((spec) => {
    const stats = specCoverage(spec);
    const pct = stats.total === 0 ? 0 : Math.round((stats.weighted / stats.total) * 100);
    return {
      id: spec.id,
      title: spec.title,
      filename: spec.filename,
      pct,
      total: stats.total,
      weighted: stats.weighted,
      hidden: props.hasFilters && !props.matchingIds.has(spec.id),
    };
  });
});
</script>

<template>
  <nav class="spec-toc" aria-label="Spec sections">
    <ol>
      <li
        v-for="row in rows"
        :key="row.id"
        :class="{
          active: row.id === selectedId,
          hidden: row.hidden,
          empty: row.total === 0,
        }"
      >
        <button
          type="button"
          class="spec-toc-item"
          @click="$emit('select', row.id)"
        >
          <span class="spec-toc-id">§ {{ row.id }}</span>
          <span class="spec-toc-title">{{ row.title }}</span>
          <span v-if="row.total > 0" class="spec-toc-coverage">
            <span
              class="spec-toc-bar"
              :style="{ '--pct': row.pct + '%' }"
              :aria-label="`${row.pct}% covered`"
            />
            <span class="spec-toc-pct">{{ row.pct }}%</span>
          </span>
          <span v-else class="spec-toc-coverage muted">no scenarios</span>
        </button>
      </li>
    </ol>
  </nav>
</template>
