<script setup lang="ts">
import { BookOpen, CircleArrowUp, Compass, GraduationCap, Rocket } from '@lucide/vue';
import { computed, onBeforeUnmount, ref, watch, type Component } from 'vue';
import { useRoute } from 'vue-router';
import Wordmark from '../components/Wordmark.vue';
import { HELP_PAGES, HELP_SECTIONS, helpLink, type HelpPageId } from '../help';

// The Help Center layout (#0060): sidebar navigation around the Help pages,
// with the active page's sections underneath and the one in view marked.
const ICONS: Record<HelpPageId, Component> = {
  overview: Compass,
  learn: GraduationCap,
  setup: Rocket,
  upgrade: CircleArrowUp,
  reference: BookOpen,
};

const route = useRoute();
const from = computed(() => route.query.from);
const back = computed(() => (typeof from.value === 'string' && from.value ? `/w/${from.value}` : '/'));
const activePage = computed(() => HELP_PAGES.find((p) => p.path === route.path)?.id ?? 'overview');
const sections = computed(() => HELP_SECTIONS[activePage.value] ?? []);

const inView = ref('');
let observer: IntersectionObserver | null = null;

function observeSections() {
  observer?.disconnect();
  inView.value = sections.value[0]?.id ?? '';
  if (!sections.value.length || typeof IntersectionObserver === 'undefined') return;
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) inView.value = e.target.id;
    },
    { rootMargin: '-12% 0px -78% 0px' },
  );
  for (const s of sections.value) {
    const el = document.getElementById(s.id);
    if (el) observer.observe(el);
  }
}

watch(() => route.path, observeSections, { flush: 'post', immediate: true });
onBeforeUnmount(() => observer?.disconnect());

// #app is the scroller, not the window, so the router's scrollBehavior can't
// reach it: jump to the hash, or to the top on a new page.
const root = ref<HTMLElement | null>(null);
watch(
  () => [route.path, route.hash] as const,
  ([path, hash], old) => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView({ behavior: old && old[0] === path ? 'smooth' : 'auto', block: 'start' });
    else if (!old || old[0] !== path) root.value?.scrollIntoView({ block: 'start' });
  },
  { flush: 'post', immediate: true },
);
</script>

<template>
  <div ref="root" class="hc">
    <aside class="hc-side">
      <div class="hc-side-top">
        <RouterLink class="hc-brand" :to="helpLink('/help', from)" aria-label="Help Center home"><Wordmark :size="18" /></RouterLink>
        <RouterLink class="help-back" :to="back">← Back to the board</RouterLink>
      </div>
      <nav class="hc-nav" aria-label="Help Center">
        <p class="hc-label">Help Center</p>
        <template v-for="p in HELP_PAGES" :key="p.id">
          <RouterLink
            class="hc-link"
            :class="{ on: activePage === p.id }"
            :to="helpLink(p.path, from)"
            :aria-current="activePage === p.id ? 'page' : undefined"
          >
            <component :is="ICONS[p.id]" class="hc-link-icon" :size="15" aria-hidden="true" />
            {{ p.title }}
          </RouterLink>
          <ul v-if="activePage === p.id && sections.length" class="hc-sections" :aria-label="`${p.title} sections`">
            <li v-for="s in sections" :key="s.id">
              <RouterLink :to="helpLink(p.path, from, s.id)" :class="{ on: inView === s.id }">{{ s.title }}</RouterLink>
            </li>
          </ul>
        </template>
      </nav>
      <p class="hc-credit">
        Skills and ideas adapted from
        <a href="https://github.com/mattpocock/skills" target="_blank" rel="noopener">Matt Pocock’s skills</a>.
      </p>
    </aside>
    <main class="hc-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.hc { display: grid; grid-template-columns: 248px minmax(0, 1fr); min-height: 100%; font-family: var(--sans); }
.hc-side {
  position: sticky; top: 0; height: 100vh; overflow-y: auto;
  display: flex; flex-direction: column; gap: 18px;
  padding: 18px 14px; border-right: 1px solid var(--border-subtle); background: var(--bg-subtle);
}
.hc-side-top { display: grid; gap: 10px; padding: 0 8px; }
.hc-brand { text-decoration: none; justify-self: start; }
.hc-label { margin: 0 0 4px; padding: 0 8px; font-size: 11px; font-weight: 600; color: var(--text-3); letter-spacing: 0.04em; text-transform: uppercase; }
.hc-nav { display: grid; gap: 1px; }
.hc-link {
  display: flex; align-items: center; gap: 9px; height: 30px; padding: 0 8px; border-radius: var(--r);
  font-size: 13px; font-weight: 500; color: var(--text-2); text-decoration: none;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
}
.hc-link:hover { background: var(--bg-hover); color: var(--text); }
.hc-link.on { background: var(--bg-active); color: var(--text); }
.hc-link-icon { flex: none; color: var(--text-3); }
.hc-link.on .hc-link-icon { color: var(--accent-text); }
.hc-sections { list-style: none; margin: 2px 0 8px 15px; padding: 0 0 0 12px; border-left: 1px solid var(--border); display: grid; gap: 1px; }
.hc-sections a {
  display: block; padding: 4px 8px; border-radius: var(--r-sm); font-size: 12.5px; line-height: 1.35; color: var(--text-3); text-decoration: none;
  transition: color var(--dur) var(--ease), background var(--dur) var(--ease);
}
.hc-sections a:hover { color: var(--text); background: var(--bg-hover); }
.hc-sections a.on { color: var(--accent-text); }
.hc-credit { margin: auto 8px 0; font-size: 12px; line-height: 1.5; color: var(--text-3); }
.hc-credit a { color: var(--text-2); }
.hc-main { min-width: 0; padding: 44px 56px 120px; }

/* Shared page typography for every Help page rendered in the outlet. */
.hc-main :deep(.hc-page) { max-width: 780px; margin: 0 auto; }
.hc-main :deep(.hc-page.wide) { max-width: 980px; }
.hc-main :deep(.hc-eyebrow) { margin: 0 0 8px; font-size: 12.5px; font-weight: 500; color: var(--accent-text); }
.hc-main :deep(h1) { margin: 0 0 12px; font-size: 30px; font-weight: 600; letter-spacing: -0.022em; line-height: 1.15; }
.hc-main :deep(.hc-lede) { margin: 0; max-width: 640px; font-size: 15.5px; line-height: 1.6; color: var(--text-2); }
.hc-main :deep(.hc-section) { padding-top: 44px; scroll-margin-top: 24px; }
.hc-main :deep(.hc-section > h2) { margin: 0 0 10px; font-size: 19px; font-weight: 600; letter-spacing: -0.012em; }
.hc-main :deep(.hc-section > p) { margin: 0 0 12px; font-size: 14.5px; line-height: 1.6; color: var(--text-2); }
.hc-main :deep(.hc-note) { font-size: 13px; color: var(--text-3); }
.hc-main :deep(.hc-section > :not(p, h2) + .hc-note) { margin-top: 12px; }
.hc-main :deep(code) { font-family: var(--mono); font-size: 0.88em; }
.hc-main :deep(.hc-section > p code), .hc-main :deep(.hc-note code), .hc-main :deep(td code) { padding: 1px 5px; border-radius: var(--r-sm); background: var(--bg-hover); }

@media (max-width: 860px) {
  .hc { grid-template-columns: minmax(0, 1fr); }
  .hc-side { position: static; height: auto; gap: 12px; padding: 14px 16px 10px; border-right: 0; border-bottom: 1px solid var(--border-subtle); }
  .hc-side-top { grid-auto-flow: column; justify-content: space-between; align-items: center; padding: 0; }
  .hc-nav { display: flex; gap: 4px; overflow-x: auto; }
  .hc-label, .hc-sections, .hc-credit { display: none; }
  .hc-link { flex: none; }
  .hc-main { padding: 28px 16px 80px; }
  .hc-main :deep(h1) { font-size: 25px; }
}
</style>
