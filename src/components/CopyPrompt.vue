<script setup lang="ts">
import { ref } from 'vue';
import { copyText } from '../prompts';

// A prompt to paste into an agent, with a copy button (#0060): the setup
// prompt, the upgrade prompts and every empty state use it.
const props = defineProps<{ text: string; label: string }>();
const copied = ref(false);

async function copy() {
  copied.value = await copyText(props.text);
  if (copied.value) setTimeout(() => (copied.value = false), 1600);
}
</script>

<template>
  <div class="copy-prompt">
    <pre>{{ props.text }}</pre>
    <button type="button" class="primary" @click="copy">{{ copied ? 'Copied' : props.label }}</button>
  </div>
</template>

<style scoped>
.copy-prompt { display: grid; gap: 12px; padding: 14px; border: 1px solid var(--border); border-radius: var(--r-xl); background: var(--bg-subtle); text-align: left; }
.copy-prompt pre { margin: 0; font: 12.5px/1.6 var(--mono); white-space: pre-wrap; overflow-wrap: anywhere; color: var(--text); }
.copy-prompt button { justify-self: start; }
</style>
