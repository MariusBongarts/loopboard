<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { rankCommands, type Command } from '../commands';

// ⌘K (#0021): jump to anything, run any action, from one box.
const props = defineProps<{ open: boolean; commands: Command[] }>();
const emit = defineEmits<{ (e: 'close'): void }>();
const query = ref('');
const active = ref(0);
const input = ref<HTMLInputElement | null>(null);
const list = ref<HTMLElement | null>(null);

const results = computed(() => rankCommands(props.commands, query.value));
const grouped = computed(() => {
  const out: { group: string; items: { c: Command; index: number }[] }[] = [];
  results.value.forEach((c, index) => {
    let g = out.find((x) => x.group === c.group);
    if (!g) out.push((g = { group: c.group, items: [] }));
    g.items.push({ c, index });
  });
  return out;
});

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    query.value = '';
    active.value = 0;
    await nextTick();
    input.value?.focus();
  },
);
watch(query, () => (active.value = 0));

async function move(delta: number) {
  const n = results.value.length;
  if (!n) return;
  active.value = (active.value + delta + n) % n;
  await nextTick();
  list.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}

function run(c: Command | undefined) {
  if (!c) return;
  emit('close');
  c.run();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    void move(1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    void move(-1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    run(results.value[active.value]);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    emit('close');
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="palette-backdrop modal-backdrop" @click.self="emit('close')">
      <div class="palette" role="dialog" aria-label="Command palette">
        <input
          ref="input"
          v-model="query"
          class="palette-input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-label="Search issues, projects, specs and actions"
          placeholder="Search issues, projects, specs, actions…"
          autocomplete="off"
          spellcheck="false"
          @keydown="onKeydown"
        />
        <div id="palette-list" ref="list" class="palette-list" role="listbox">
          <p v-if="!results.length" class="palette-empty">No matches.</p>
          <template v-for="g in grouped" :key="g.group">
            <div class="palette-group">{{ g.group }}</div>
            <div
              v-for="{ c, index } in g.items"
              :key="c.id"
              role="option"
              class="palette-item"
              :aria-selected="index === active"
              @mousemove="active = index"
              @click="run(c)"
            >
              <span class="palette-title">{{ c.title }}</span>
              <kbd v-if="c.hint" class="palette-hint">{{ c.hint }}</kbd>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
