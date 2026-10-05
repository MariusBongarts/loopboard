<script setup lang="ts">
import { computed } from 'vue';
import { toneClass } from '../colors';
import { useWorkspace } from '../workspace';

// A project (#0046): its tone as a small square, then its title (or slug).
const props = defineProps<{ slug?: string; short?: boolean }>();
const { projects } = useWorkspace();
const title = computed(() => {
  if (!props.slug) return 'Standalone';
  return projects.value.find((p) => p.slug === props.slug)?.title ?? props.slug;
});
</script>

<template>
  <span class="project-badge" :class="props.slug ? toneClass(props.slug) : 'standalone'" :title="props.slug ?? 'Standalone'">
    <span class="project-badge-mark" aria-hidden="true" />
    <span class="project-badge-name">{{ title }}</span>
  </span>
</template>
