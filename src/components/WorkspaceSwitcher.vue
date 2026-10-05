<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { fetchWorkspaces } from '../api';
import { toneClass } from '../colors';
import type { WorkspaceSummary } from '../types';
import AddWorkspaceDialog from './AddWorkspaceDialog.vue';
import ManageWorkspacesDialog from './ManageWorkspacesDialog.vue';

// Top-left context switch between registered repos (#0008, #0009).
const props = defineProps<{ current: WorkspaceSummary | null }>();
const router = useRouter();
const open = ref(false);
const adding = ref(false);
const managing = ref(false);
const workspaces = ref<WorkspaceSummary[]>([]);
const root = ref<HTMLElement | null>(null);
const menu = ref<HTMLElement | null>(null);
// The rail clips overflow, so the menu is teleported and placed by hand.
const menuStyle = ref<Record<string, string>>({});

const currentName = computed(
  () => workspaces.value.find((w) => w.id === props.current?.id)?.name ?? props.current?.name ?? '…',
);

async function refresh() {
  try {
    workspaces.value = (await fetchWorkspaces()).workspaces;
  } catch {
    /* the menu still offers Add */
  }
}

function onDocPointer(e: PointerEvent) {
  const t = e.target as Node;
  if (root.value?.contains(t) || menu.value?.contains(t)) return;
  close();
}

function toggle() {
  if (open.value) return close();
  const rect = root.value?.getBoundingClientRect();
  if (rect) {
    menuStyle.value = {
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      width: `${Math.max(rect.width, 280)}px`,
    };
  }
  open.value = true;
  void refresh();
  document.addEventListener('pointerdown', onDocPointer);
}

function close() {
  open.value = false;
  document.removeEventListener('pointerdown', onDocPointer);
}

// Loaded up front so the menu never opens empty.
onMounted(() => void refresh());
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointer));

function go(w: WorkspaceSummary) {
  close();
  if (w.id !== props.current?.id) router.push(`/w/${w.id}`);
}

function openNeedsYou() {
  close();
  router.push({ path: '/needs-you', query: props.current ? { from: props.current.id } : {} });
}

function startAdd() {
  close();
  adding.value = true;
}

function startManage() {
  close();
  managing.value = true;
  void refresh();
}

function onAdded(w: WorkspaceSummary) {
  adding.value = false;
  router.push(`/w/${w.id}`);
}

function initial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}
</script>

<template>
  <div ref="root" class="ws-switch">
    <button
      type="button"
      class="ws-current"
      aria-haspopup="menu"
      :aria-expanded="open"
      :title="props.current?.repoPath"
      :aria-label="`Switch workspace (current: ${currentName})`"
      @click="toggle"
      @keydown.esc="close"
    >
      <span class="ws-mark" :class="toneClass(props.current?.id ?? '')">{{ initial(currentName) }}</span>
      <span class="ws-name">{{ currentName }}</span>
      <svg class="ws-chevron" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
      </svg>
    </button>
    <Teleport to="body">
    <div v-if="open" ref="menu" class="ws-menu" :style="menuStyle" role="menu" aria-label="Workspaces" @keydown.esc="close">
      <div class="ws-menu-head">Workspaces</div>
      <button
        v-for="w in workspaces"
        :key="w.id"
        type="button"
        role="menuitemradio"
        class="ws-item"
        :class="{ on: w.id === props.current?.id, missing: !w.available }"
        :aria-checked="w.id === props.current?.id"
        :title="w.repoPath"
        @click="go(w)"
      >
        <span class="ws-mark" :class="toneClass(w.id)">{{ initial(w.name) }}</span>
        <span class="ws-item-name">{{ w.name }}</span>
        <span class="ws-item-count">{{ w.available ? w.issueCount : 'folder missing' }}</span>
      </button>
      <div class="ws-sep" />
      <button type="button" role="menuitem" class="ws-action" @click="openNeedsYou">All workspaces · Needs you</button>
      <button type="button" role="menuitem" class="ws-action" @click="startAdd">+ Add workspace…</button>
      <button type="button" role="menuitem" class="ws-action" @click="startManage">Manage workspaces</button>
    </div>
    </Teleport>
    <AddWorkspaceDialog :open="adding" @close="adding = false" @added="onAdded" />
    <ManageWorkspacesDialog
      :open="managing"
      :workspaces="workspaces"
      :current-id="props.current?.id ?? null"
      @close="managing = false"
      @changed="refresh"
    />
  </div>
</template>
