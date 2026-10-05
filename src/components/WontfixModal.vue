<script setup lang="ts">
import { ref, watch } from 'vue';
import BaseDialog from './BaseDialog.vue';

const props = defineProps<{ open: boolean; issueTitle: string }>();
const emit = defineEmits<{
  (e: 'confirm', reason: string): void;
  (e: 'cancel'): void;
}>();

const reason = ref('');

watch(
  () => props.open,
  (v) => {
    if (v) reason.value = '';
  },
);

function submit() {
  const trimmed = reason.value.trim();
  if (!trimmed) return;
  emit('confirm', trimmed);
}
</script>

<template>
  <BaseDialog :open="props.open" label="Why rejected" eyebrow="Why rejected" @close="emit('cancel')">
    <h3>Mark <em>{{ props.issueTitle }}</em> as wontfix</h3>
    <p>
      The issue body will get a <code>## Why rejected</code> section appended
      before the status flips. The institutional-memory record needs a real
      reason — empty input is rejected.
    </p>
    <textarea
      v-model="reason"
      rows="5"
      placeholder="e.g. duplicates #0042; the new pricing model already covers this case."
      @keydown.meta.enter="submit"
      @keydown.ctrl.enter="submit"
    />
    <template #actions>
      <button @click="emit('cancel')">Cancel</button>
      <button class="primary" :disabled="!reason.trim()" @click="submit">Append &amp; mark wontfix</button>
    </template>
  </BaseDialog>
</template>
