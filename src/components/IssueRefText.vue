<script setup lang="ts">
import { computed } from 'vue';
import { issueRefSegments } from '../inbox';

const props = defineProps<{ text: string }>();
const emit = defineEmits<{ (e: 'open-id', id: string): void }>();

const segments = computed(() => issueRefSegments(props.text));
</script>

<template>
  <template v-for="(s, i) in segments" :key="i">
    <button
      v-if="s.kind === 'issue'"
      type="button"
      class="issue-ref"
      @click.stop="emit('open-id', s.id)"
    >#{{ s.id }}</button>
    <template v-else>{{ s.value }}</template>
  </template>
</template>
