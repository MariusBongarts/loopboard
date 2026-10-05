<script setup lang="ts">
import { ref } from 'vue';
import setupPrompt from '../../docs/setup-prompt.md?raw';

// The one setup prompt (docs/setup-prompt.md), copyable everywhere it shows.
const prompt = setupPrompt.trimEnd();
const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(prompt);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    copied.value = false;
  }
}
</script>

<template>
  <div class="setup-prompt">
    <pre>{{ prompt }}</pre>
    <button type="button" class="primary" @click="copy">{{ copied ? 'Copied' : 'Copy setup prompt' }}</button>
  </div>
</template>
