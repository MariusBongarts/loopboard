<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

// Shared modal shell: backdrop click and Esc close it, focus lands on the
// first field (or the dialog) when it opens.
const props = defineProps<{ open: boolean; label: string; eyebrow?: string; wide?: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();
const panel = ref<HTMLElement | null>(null);

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    await nextTick();
    const field = panel.value?.querySelector<HTMLElement>('input, textarea, [autofocus]');
    (field ?? panel.value)?.focus();
  },
  { immediate: true },
);

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  e.stopPropagation();
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="modal-backdrop" @click.self="emit('close')" @keydown="onKeydown">
      <div ref="panel" class="modal" :class="{ 'modal-wide': props.wide }" role="dialog" :aria-label="props.label" tabindex="-1">
        <p v-if="props.eyebrow" class="eyebrow">{{ props.eyebrow }}</p>
        <slot />
        <div v-if="$slots.actions" class="actions">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
