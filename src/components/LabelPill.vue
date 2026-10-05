<script setup lang="ts">
import { toneClass } from '../colors';

// A label (#0046): a small pill with the label's tone as a dot.
defineProps<{ label: string }>();
</script>

<template>
  <span class="pill" :class="toneClass(label)"><span class="pill-dot" aria-hidden="true" />{{ label }}</span>
</template>
