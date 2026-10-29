<script setup lang="ts">
import type { Peek } from '../../home';
import { usePeek } from '../../peek';

// A link that opens a preview on Home (#0130): a real href, so it can be
// copied or opened in a new tab; a plain click opens the preview in place.
const props = defineProps<{ to: Peek }>();
const nav = usePeek();

function onClick(e: MouseEvent) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  nav.open(props.to);
}
</script>

<template>
  <a :href="nav.href(props.to)" :data-issue="props.to.kind === 'issue' ? props.to.id : undefined" @click="onClick"><slot /></a>
</template>
