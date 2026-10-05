<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Check, ChevronRight, Plus } from '@lucide/vue';
import { activeMenu, closeMenu, filterEntries, type MenuEntry, type MenuItem } from '../menu';
import Avatar from './Avatar.vue';
import StatusIcon from './StatusIcon.vue';

// Renders the one open menu (#0052, #0055): anchored or at the pointer,
// arrow keys, type-to-filter, one level of submenu, Esc to close. Items never
// take focus, so typing keeps going to the filter after a click.
const root = ref<HTMLElement | null>(null);
const subEl = ref<HTMLElement | null>(null);
const filterInput = ref<HTMLInputElement | null>(null);
const query = ref('');
const index = ref(0);
const subIndex = ref(-1);
const subOpenFor = ref<string | null>(null);
const pos = ref({ x: 0, y: 0 });
const subPos = ref({ x: 0, y: 0 });
let returnFocus: HTMLElement | null = null;

const entries = computed<MenuEntry[]>(() => {
  const m = activeMenu.value;
  if (!m) return [];
  const list = filterEntries(m.items(), query.value);
  const text = query.value.trim();
  if (m.create && text && !list.some((e) => e !== 'separator' && e.label.toLowerCase() === text.toLowerCase())) {
    const extra = m.create(text);
    if (extra) return [...list, extra];
  }
  return list;
});
const items = computed(() => entries.value.filter((e): e is MenuItem => e !== 'separator'));
const subItems = computed(() => {
  const owner = items.value.find((i) => i.id === subOpenFor.value);
  return owner?.children ? owner.children().filter((e): e is MenuItem => e !== 'separator') : [];
});

function place(anchor: HTMLElement | { x: number; y: number }) {
  if (anchor instanceof HTMLElement) {
    const r = anchor.getBoundingClientRect();
    pos.value = { x: r.left, y: r.bottom + 4 };
  } else pos.value = { ...anchor };
}

// Keep the menu inside the viewport once its size is known.
async function clamp(element: () => HTMLElement | null, target: { value: { x: number; y: number } }) {
  await nextTick();
  const el = element();
  if (!el) return;
  const r = el.getBoundingClientRect();
  const x = Math.max(8, Math.min(target.value.x, window.innerWidth - r.width - 8));
  const y = r.bottom > window.innerHeight - 8 ? Math.max(8, window.innerHeight - r.height - 8) : target.value.y;
  target.value = { x, y };
}

watch(activeMenu, async (m) => {
  query.value = '';
  index.value = 0;
  subOpenFor.value = null;
  subIndex.value = -1;
  if (!m) {
    returnFocus?.focus?.();
    returnFocus = null;
    return;
  }
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  place(m.at);
  await clamp(() => root.value, pos);
  (filterInput.value ?? root.value)?.focus();
});
watch(query, () => {
  index.value = 0;
  subOpenFor.value = null;
});

function run(item: MenuItem | undefined) {
  if (!item || item.disabled) return;
  if (item.children) {
    openSub(item);
    subIndex.value = 0;
    return;
  }
  item.run?.();
  if (!item.keepOpen) closeMenu();
}

async function openSub(item: MenuItem) {
  if (!item.children) {
    subOpenFor.value = null;
    return;
  }
  subOpenFor.value = item.id;
  subIndex.value = -1;
  const el = root.value?.querySelector<HTMLElement>(`[data-menu-id="${CSS.escape(item.id)}"]`);
  const r = el?.getBoundingClientRect();
  if (r) subPos.value = { x: r.right + 2, y: r.top - 5 };
  await nextTick();
  const s = subEl.value?.getBoundingClientRect();
  if (s && r && s.right > window.innerWidth - 8) subPos.value = { x: r.left - s.width - 2, y: subPos.value.y };
  await clamp(() => subEl.value, subPos);
}

function onKeydown(e: KeyboardEvent) {
  e.stopPropagation();
  const inSub = subOpenFor.value !== null && subIndex.value >= 0;
  const list = inSub ? subItems.value : items.value;
  const cur = inSub ? subIndex : index;
  const n = list.length;
  if (e.key === 'Escape') {
    e.preventDefault();
    if (inSub) {
      subIndex.value = -1;
      subOpenFor.value = null;
    } else closeMenu();
  } else if (e.key === 'ArrowDown' && n) {
    e.preventDefault();
    cur.value = (cur.value + 1) % n;
  } else if (e.key === 'ArrowUp' && n) {
    e.preventDefault();
    cur.value = (cur.value - 1 + n) % n;
  } else if (e.key === 'ArrowRight' && !inSub && items.value[index.value]?.children) {
    e.preventDefault();
    void openSub(items.value[index.value]).then(() => (subIndex.value = 0));
  } else if (e.key === 'ArrowLeft' && inSub) {
    e.preventDefault();
    subIndex.value = -1;
    subOpenFor.value = null;
  } else if (e.key === 'Enter' || (e.key === ' ' && !activeMenu.value?.filter)) {
    e.preventDefault();
    run(list[cur.value]);
  } else if (e.key === 'Tab') {
    e.preventDefault();
    closeMenu();
  }
}

function onPointerdownOutside(e: PointerEvent) {
  if (!activeMenu.value) return;
  const t = e.target as Node;
  if (root.value?.contains(t) || subEl.value?.contains(t)) return;
  closeMenu();
}
function onViewportChange() {
  if (activeMenu.value) closeMenu();
}
onMounted(() => {
  document.addEventListener('pointerdown', onPointerdownOutside, true);
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('blur', onViewportChange);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerdownOutside, true);
  window.removeEventListener('resize', onViewportChange);
  window.removeEventListener('blur', onViewportChange);
  closeMenu();
});
</script>

<template>
  <Teleport to="body">
    <template v-if="activeMenu">
      <div
        ref="root"
        class="menu"
        role="menu"
        tabindex="-1"
        :aria-label="activeMenu.label"
        :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
        @keydown="onKeydown"
        @contextmenu.prevent
      >
        <input
          v-if="activeMenu.filter"
          ref="filterInput"
          v-model="query"
          class="menu-filter"
          :placeholder="activeMenu.filter"
          :aria-label="activeMenu.filter"
        />
        <div class="menu-list">
          <template v-for="(entry, i) in entries" :key="entry === 'separator' ? `sep-${i}` : entry.id">
            <div v-if="entry === 'separator'" class="menu-sep" role="separator" />
            <button
              v-else
              type="button"
              tabindex="-1"
              class="menu-item"
              :class="{ active: items[index]?.id === entry.id && subIndex < 0, open: subOpenFor === entry.id, danger: entry.danger }"
              :role="entry.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'"
              :aria-checked="entry.checked"
              :aria-haspopup="entry.children ? 'menu' : undefined"
              :disabled="entry.disabled"
              :data-menu-id="entry.id"
              @mouseenter="index = items.indexOf(entry); openSub(entry)"
              @mousedown.prevent
              @click="run(entry)"
            >
              <span v-if="entry.checked !== undefined" class="menu-check"><Check v-if="entry.checked" :size="14" aria-hidden="true" /></span>
              <StatusIcon v-if="entry.status" :status="entry.status" />
              <Avatar v-else-if="entry.assignee" :assignee="entry.assignee" :size="16" />
              <span v-else-if="entry.tone" class="menu-tone" :class="[entry.toneShape ?? 'dot', entry.tone]" aria-hidden="true" />
              <component :is="entry.icon" v-else-if="entry.icon" class="menu-icon" :size="15" aria-hidden="true" />
              <Plus v-else-if="entry.id.startsWith('create:')" class="menu-icon" :size="15" aria-hidden="true" />
              <span class="menu-label">{{ entry.label }}</span>
              <span v-if="entry.hint" class="menu-hint">{{ entry.hint }}</span>
              <ChevronRight v-if="entry.children" class="menu-icon" :size="14" aria-hidden="true" />
            </button>
          </template>
          <p v-if="!entries.length" class="menu-empty">No matches</p>
        </div>
      </div>
      <div
        v-if="subItems.length"
        ref="subEl"
        class="menu menu-sub"
        role="menu"
        :style="{ left: `${subPos.x}px`, top: `${subPos.y}px` }"
        @keydown="onKeydown"
      >
        <div class="menu-list">
          <button
            v-for="(item, i) in subItems"
            :key="item.id"
            type="button"
            tabindex="-1"
            class="menu-item"
            :class="{ active: subIndex === i, danger: item.danger }"
            :role="item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'"
            :aria-checked="item.checked"
            :disabled="item.disabled"
            @mouseenter="subIndex = i"
            @mousedown.prevent
            @click="run(item)"
          >
            <span v-if="item.checked !== undefined" class="menu-check"><Check v-if="item.checked" :size="14" aria-hidden="true" /></span>
            <StatusIcon v-if="item.status" :status="item.status" />
            <Avatar v-else-if="item.assignee" :assignee="item.assignee" :size="16" />
            <span v-else-if="item.tone" class="menu-tone" :class="[item.toneShape ?? 'dot', item.tone]" aria-hidden="true" />
            <component :is="item.icon" v-else-if="item.icon" class="menu-icon" :size="15" aria-hidden="true" />
            <span class="menu-label">{{ item.label }}</span>
            <span v-if="item.hint" class="menu-hint">{{ item.hint }}</span>
          </button>
        </div>
      </div>
    </template>
  </Teleport>
</template>
