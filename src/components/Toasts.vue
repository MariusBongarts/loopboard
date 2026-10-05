<script setup lang="ts">
import { dismissToast, toasts } from '../toast';
</script>

<template>
  <div class="toasts" role="status" aria-live="polite">
    <div v-for="t in toasts" :key="t.id" class="toast">
      <span>{{ t.text }}</span>
      <button
        v-if="t.action"
        type="button"
        class="toast-action"
        @click="
          t.action.run();
          dismissToast(t.id);
        "
      >
        {{ t.action.label }}
      </button>
    </div>
  </div>
</template>
