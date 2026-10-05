<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

// A small header badge that opens its content in a popover. Esc, a click
// outside, or following a link or button inside closes it.
defineOptions({ inheritAttrs: false });
const props = defineProps<{ label: string; tone?: string }>();

const open = ref(false);
const trigger = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const pos = ref({ x: 0, y: 0 });

async function show() {
  const r = trigger.value?.getBoundingClientRect();
  if (!r) return;
  pos.value = { x: r.left, y: r.bottom + 6 };
  open.value = true;
  await nextTick();
  const p = panel.value?.getBoundingClientRect();
  if (p) pos.value = { x: Math.max(8, Math.min(pos.value.x, window.innerWidth - p.width - 8)), y: pos.value.y };
}

function close() {
  open.value = false;
}

function onPointerdown(e: PointerEvent) {
  const t = e.target as Node;
  if (trigger.value?.contains(t) || panel.value?.contains(t)) return;
  close();
}

// Captured before the window-level Esc that closes the issue panel.
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  e.stopPropagation();
  close();
  trigger.value?.focus();
}

// Captured because issue refs stop propagation; closed after the click so
// the content isn't unmounted before its handler emits.
function onPanelClick(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('a, button')) setTimeout(close);
}

function listen(on: boolean) {
  if (on) {
    document.addEventListener('pointerdown', onPointerdown, true);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('resize', close);
  } else {
    document.removeEventListener('pointerdown', onPointerdown, true);
    document.removeEventListener('keydown', onKeydown, true);
    window.removeEventListener('resize', close);
  }
}
watch(open, listen);
onBeforeUnmount(() => listen(false));
</script>

<template>
  <button
    ref="trigger"
    v-bind="$attrs"
    type="button"
    class="pill badge-pop"
    :class="[props.tone, { on: open }]"
    aria-haspopup="dialog"
    :aria-expanded="open"
    :aria-label="props.label"
    :title="props.label"
    @click="open ? close() : show()"
  >
    <slot name="badge">{{ props.label }}</slot>
  </button>
  <Teleport to="body">
    <div
      v-if="open"
      ref="panel"
      class="popover"
      :class="props.tone"
      role="dialog"
      :aria-label="props.label"
      :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
      @click.capture="onPanelClick"
    >
      <div class="popover-head">{{ props.label }}</div>
      <slot />
    </div>
  </Teleport>
</template>
