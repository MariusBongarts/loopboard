<script setup lang="ts">
import type { Resizer } from '../resize';

// The separator for a resizable pane (#0048): drag, arrow keys, double-click.
const props = defineProps<{ resizer: Resizer; label: string }>();
</script>

<template>
  <div
    class="resize-handle"
    role="separator"
    aria-orientation="vertical"
    tabindex="0"
    :aria-label="props.label"
    :aria-valuenow="props.resizer.size.value"
    :aria-valuemin="props.resizer.min"
    :aria-valuemax="props.resizer.max"
    title="Drag to resize · double-click to reset"
    @pointerdown="props.resizer.onPointerdown"
    @keydown="props.resizer.onKeydown"
    @dblclick="props.resizer.reset"
  />
</template>
