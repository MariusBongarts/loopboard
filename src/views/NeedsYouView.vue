<script setup lang="ts">
import IssueRow from '../components/IssueRow.vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { fetchNeedsYou, type NeedsYouGroup } from '../api';
import { toneClass } from '../colors';

// "Needs you" across every workspace (#0023). Refetched on open and on
// window focus rather than watching every repo.
const route = useRoute();
const groups = ref<NeedsYouGroup[] | null>(null);
const error = ref<string | null>(null);
const back = computed(() => (typeof route.query.from === 'string' ? `/w/${route.query.from}` : '/'));
const total = computed(() => groups.value?.reduce((n, g) => n + g.items.length, 0) ?? 0);
const withItems = computed(() => groups.value?.filter((g) => g.items.length) ?? []);
const skipped = computed(() => groups.value?.filter((g) => !g.available) ?? []);

async function load() {
  try {
    groups.value = await fetchNeedsYou();
    error.value = null;
  } catch (e) {
    error.value = (e as Error).message;
  }
}

onMounted(() => {
  document.title = 'Needs you · loopboard';
  void load();
  window.addEventListener('focus', load);
});
onUnmounted(() => window.removeEventListener('focus', load));
</script>

<template>
  <main class="needs">
    <RouterLink class="help-back" :to="back">← Back to the board</RouterLink>
    <h1>Needs you <span class="needs-count">{{ total }}</span></h1>
    <p class="needs-sub">Issues assigned to you and blocked issues, in every workspace.</p>
    <p v-if="error" class="banner-error">{{ error }}</p>
    <p v-else-if="groups && !withItems.length" class="needs-empty">Nothing is waiting on you. 🎉</p>
    <section v-for="g in withItems" :key="g.workspace.id" class="needs-group">
      <h2>
        <span class="ws-mark" :class="toneClass(g.workspace.id)">{{ g.workspace.name[0]?.toUpperCase() }}</span>
        {{ g.workspace.name }}
        <span class="needs-count">{{ g.items.length }}</span>
      </h2>
      <IssueRow
        v-for="i in g.items"
        :key="i.id"
        class="needs-row"
        :issue="i"
        :to="{ path: `/w/${g.workspace.id}`, query: { item: `i:${i.id}` } }"
      />
    </section>
    <p v-if="skipped.length" class="needs-skipped">
      Skipped (folder missing): {{ skipped.map((g) => g.workspace.name).join(', ') }}
    </p>
  </main>
</template>
