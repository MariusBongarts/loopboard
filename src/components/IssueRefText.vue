<script setup lang="ts">
import { computed } from 'vue';
import { issueRefSegments } from '../inbox';
import { useWorkspace } from '../workspace';

// `#NNNN` becomes a button only when the issue exists, so no click leads nowhere.
const props = defineProps<{ text: string }>();
const emit = defineEmits<{ (e: 'open-id', id: string): void }>();
const { issues } = useWorkspace();

const known = computed(() => new Set(issues.value.map((i) => i.id)));
const segments = computed(() => issueRefSegments(props.text));
</script>

<template>
  <template v-for="(s, i) in segments" :key="i">
    <button
      v-if="s.kind === 'issue' && known.has(s.id)"
      type="button"
      class="issue-ref"
      @click.stop="emit('open-id', s.id)"
    >#{{ s.id }}</button>
    <template v-else-if="s.kind === 'issue'">#{{ s.id }}</template>
    <template v-else>{{ s.value }}</template>
  </template>
</template>
