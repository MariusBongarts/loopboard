<script setup lang="ts">
import { computed, ref } from 'vue';
import { marked } from 'marked';
import type { Issue } from '../types';
import { relativePath } from '../types';
import { toneClass } from '../colors';

const props = defineProps<{ issue: Issue | null }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'send-to-backlog', issue: Issue): void;
}>();

const html = computed(() => {
  if (!props.issue) return '';
  return marked.parse(props.issue.body, { gfm: true, breaks: false }) as string;
});

const path = computed(() => (props.issue ? relativePath(props.issue) : ''));
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

async function copyPath() {
  const value = path.value;
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Clipboard API unavailable (older browsers / non-secure contexts).
    // The element's title= attribute remains as a fallback affordance.
    return;
  }
  copied.value = true;
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    copied.value = false;
  }, 1200);
}

function onSendToBacklog() {
  if (!props.issue) return;
  emit('send-to-backlog', props.issue);
  emit('close');
}
</script>

<template>
  <template v-if="props.issue">
    <div class="drawer-backdrop" @click="$emit('close')" />
    <aside class="drawer" role="dialog" aria-label="Issue detail">
      <div class="drawer-head">
        <div>
          <div class="card-top" style="margin-bottom: 4px;">
            <span class="card-id">#{{ props.issue.id }}</span>
            <span class="card-cat" :class="props.issue.category">{{ props.issue.category }}</span>
            <span class="card-cat" style="text-transform: none;">{{ props.issue.status }}</span>
          </div>
          <h2>{{ props.issue.title }}</h2>
        </div>
        <button class="close" @click="$emit('close')">Close</button>
      </div>
      <div class="drawer-meta">
        <span
          v-if="props.issue.project"
          class="card-project"
          :class="toneClass(props.issue.project)"
        >{{ props.issue.project }}</span>
        <span v-else class="card-project standalone">standalone</span>
        <span v-if="props.issue.phase" class="card-label">phase {{ props.issue.phase }}</span>
        <span v-if="props.issue.parent" class="card-label">parent #{{ props.issue.parent }}</span>
        <span v-if="props.issue.created" class="card-label">{{ props.issue.created }}</span>
        <span v-if="props.issue.archived" class="card-label">archived</span>
        <span
          v-for="l in props.issue.labels"
          :key="l"
          class="card-label"
          :class="toneClass(l)"
        >{{ l }}</span>
        <button
          type="button"
          class="drawer-path"
          :title="path"
          @click="copyPath"
        >{{ path }}</button>
        <span v-if="copied" class="drawer-path-copied">Copied</span>
        <button
          v-if="props.issue.status === 'todo' && !props.issue.archived"
          type="button"
          class="drawer-send-to-backlog"
          title="Send to backlog — defer this issue until ready to schedule"
          @click="onSendToBacklog"
        >Send to backlog</button>
      </div>
      <div class="drawer-body" v-html="html" />
    </aside>
  </template>
</template>
