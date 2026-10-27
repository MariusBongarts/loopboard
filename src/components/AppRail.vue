<script setup lang="ts">
import { nextTick, ref, type Component } from 'vue';
import {
  Box,
  CalendarClock,
  CircleDot,
  CircleHelp,
  CircleUserRound,
  FileCheck2,
  FileWarning,
  Inbox,
  Layers,
  List,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ScrollText,
  Search,
  Settings,
  SquarePen,
} from '@lucide/vue';
import PinIcon from './icons/PinIcon.vue';
import WorkspaceSwitcher from './WorkspaceSwitcher.vue';
import type { SavedView } from '../api';
import { toneClass } from '../colors';
import { prdNumber, relativeDay, type InboxFilter } from '../inbox';
import type { LiveState } from '../live';
import { skippedLabel, type Project, type WorkspaceSummary } from '../types';
import type { View } from '../workspace';

// The rail (#0047): feed views, workspace destinations, saved views and
// projects — the one place to filter the feed. Collapses to icons.
const props = defineProps<{
  workspace: WorkspaceSummary | null;
  live: LiveState;
  view: View;
  filter: InboxFilter;
  scope: string | null;
  counts: Record<InboxFilter, number>;
  projectsCount: number;
  specsCount: number;
  routinesCount: number;
  skippedCount: number;
  sections: { label: string; projects: Project[] }[];
  pinned: string[];
  views: SavedView[];
  activeViewId: string | null;
  today: string;
}>();
const query = defineModel<string>('query', { required: true });
const collapsed = defineModel<boolean>('collapsed', { required: true });
const emit = defineEmits<{
  (e: 'refresh' | 'new-issue' | 'new-project' | 'settings' | 'open-issues' | 'skipped'): void;
  (e: 'set-filter', filter: InboxFilter): void;
  (e: 'scope' | 'toggle-pin', slug: string): void;
  (e: 'show-view', view: View): void;
  (e: 'open-view', view: SavedView): void;
}>();

const FEED: { key: InboxFilter; label: string; icon: Component }[] = [
  { key: 'all', label: 'Inbox', icon: Inbox },
  { key: 'you', label: 'Needs you', icon: CircleUserRound },
  { key: 'sessions', label: 'Sessions', icon: ScrollText },
  { key: 'issues', label: 'Issues', icon: CircleDot },
];

// The live indicator (#0010) says when the board isn't live, and a click on
// it always refreshes (#0072).
const LIVE: Record<LiveState, { badge?: string; title: string }> = {
  connecting: { title: 'Connecting… Click to refresh.' },
  live: { title: 'Live — updates as files change. Click to refresh.' },
  stale: { badge: 'Not live', title: "Not live — loopboard can't watch this folder right now and keeps retrying. Click to refresh." },
  offline: { badge: 'Offline', title: 'Lost the connection to loopboard — retrying. Click to refresh.' },
};

const searchInput = ref<HTMLInputElement | null>(null);
async function focusSearch() {
  collapsed.value = false;
  await nextTick();
  searchInput.value?.focus();
  searchInput.value?.select();
}
defineExpose({ focusSearch });

const feedOn = (key: InboxFilter) => props.view === 'feed' && props.filter === key && !props.scope;
</script>

<template>
  <nav class="inbox-rail" :class="{ collapsed }" aria-label="Inbox navigation">
    <div class="rail-head">
      <WorkspaceSwitcher :current="props.workspace" />
      <template v-if="!collapsed">
        <button type="button" class="rail-icon" title="New issue (C)" aria-label="New issue" @click="emit('new-issue')">
          <SquarePen :size="15" aria-hidden="true" />
        </button>
      </template>
      <span class="live-status" role="status">
        <button
          type="button"
          :class="[LIVE[props.live].badge ? 'live-badge' : 'live-dot', props.live]"
          :title="LIVE[props.live].title"
          :aria-label="LIVE[props.live].title"
          @click="emit('refresh')"
        >{{ LIVE[props.live].badge }}</button>
      </span>
    </div>

    <div v-if="!collapsed" class="rail-search-wrap">
      <Search class="rail-search-icon" :size="14" aria-hidden="true" />
      <input
        ref="searchInput"
        v-model="query"
        type="search"
        class="rail-search"
        placeholder="Search"
        aria-label="Search issues, sessions and PRDs"
        @keydown.esc="query = ''"
      />
      <kbd v-if="!query">/</kbd>
    </div>
    <button v-else type="button" class="rail-nav" title="Search (/)" aria-label="Search" @click="focusSearch">
      <Search class="rail-icon-glyph" :size="16" aria-hidden="true" />
    </button>
    <button v-if="collapsed" type="button" class="rail-nav" title="New issue (C)" aria-label="New issue" @click="emit('new-issue')">
      <SquarePen class="rail-icon-glyph" :size="16" aria-hidden="true" />
    </button>

    <div class="rail-group">
      <button
        v-for="f in FEED"
        :key="f.key"
        type="button"
        class="rail-nav"
        :class="{ on: feedOn(f.key) }"
        :aria-current="feedOn(f.key) ? 'page' : undefined"
        :title="f.label"
        @click="emit('set-filter', f.key)"
      >
        <component :is="f.icon" class="rail-icon-glyph" :size="16" aria-hidden="true" />
        <span class="rail-name">{{ f.label }}</span>
        <span class="rail-count" :class="{ hot: f.key === 'you' && props.counts.you > 0 }">{{ props.counts[f.key] }}</span>
      </button>
    </div>

    <div class="rail-sec"><span class="rail-sec-label">Workspace</span></div>
    <div class="rail-group">
      <button
        type="button"
        class="rail-nav"
        :class="{ on: props.view === 'issues' && !props.activeViewId }"
        title="All issues"
        @click="emit('open-issues')"
      >
        <List class="rail-icon-glyph" :size="16" aria-hidden="true" />
        <span class="rail-name">All issues</span>
        <span class="rail-count">{{ props.counts.issues }}</span>
      </button>
      <button type="button" class="rail-nav" :class="{ on: props.view === 'projects' }" title="Projects" @click="emit('show-view', 'projects')">
        <Box class="rail-icon-glyph" :size="16" aria-hidden="true" />
        <span class="rail-name">Projects</span>
        <span class="rail-count">{{ props.projectsCount }}</span>
      </button>
      <button type="button" class="rail-nav" :class="{ on: props.view === 'specs' }" title="Specs" @click="emit('show-view', 'specs')">
        <FileCheck2 class="rail-icon-glyph" :size="16" aria-hidden="true" />
        <span class="rail-name">Specs</span>
        <span class="rail-count">{{ props.specsCount }}</span>
      </button>
      <!-- Only in a harness that has routines (#0120); ⌘K reaches the view anyway. -->
      <button
        v-if="props.routinesCount"
        type="button"
        class="rail-nav"
        :class="{ on: props.view === 'routines' || props.view === 'routine' }"
        title="Routines"
        @click="emit('show-view', 'routines')"
      >
        <CalendarClock class="rail-icon-glyph" :size="16" aria-hidden="true" />
        <span class="rail-name">Routines</span>
        <span class="rail-count">{{ props.routinesCount }}</span>
      </button>
    </div>

    <template v-if="props.views.length">
      <div class="rail-sec"><span class="rail-sec-label">Views</span></div>
      <div class="rail-group">
        <button
          v-for="v in props.views"
          :key="v.id"
          type="button"
          class="rail-nav"
          :class="{ on: props.view === 'issues' && props.activeViewId === v.id }"
          :title="v.name"
          @click="emit('open-view', v)"
        >
          <Layers class="rail-icon-glyph" :size="16" aria-hidden="true" />
          <span class="rail-name">{{ v.name }}</span>
        </button>
      </div>
    </template>

    <template v-for="(section, i) in props.sections" :key="section.label">
      <div class="rail-sec">
        <span class="rail-sec-label">{{ section.label }}</span>
        <button
          v-if="i === 0"
          type="button"
          class="rail-sec-add"
          title="New project"
          aria-label="New project"
          @click="emit('new-project')"
        ><Plus :size="14" aria-hidden="true" /></button>
      </div>
      <div class="rail-group">
        <div
          v-for="p in section.projects"
          :key="p.slug"
          class="rail-row"
          :class="{ on: props.view === 'feed' && props.scope === p.slug }"
        >
          <button type="button" class="rail-nav" :title="p.title" @click="emit('scope', p.slug)">
            <span class="rail-dot" :class="toneClass(p.slug)" />
            <span class="prd-num">{{ prdNumber(p.slug) }}</span>
            <span class="rail-name">{{ p.title }}</span>
            <span class="rail-count">{{ relativeDay(p.lastSession, props.today) }}</span>
          </button>
          <button
            type="button"
            class="rail-pin"
            :class="{ on: props.pinned.includes(p.slug) }"
            :aria-pressed="props.pinned.includes(p.slug)"
            :aria-label="`${props.pinned.includes(p.slug) ? 'Unpin' : 'Pin'} ${p.title}`"
            :title="props.pinned.includes(p.slug) ? 'Unpin' : 'Pin'"
            @click="emit('toggle-pin', p.slug)"
          >
            <PinIcon :filled="props.pinned.includes(p.slug)" />
          </button>
        </div>
      </div>
    </template>
    <div v-if="!props.sections.length" class="rail-sec">
      <span class="rail-sec-label">Projects</span>
      <button type="button" class="rail-sec-add" title="New project" aria-label="New project" @click="emit('new-project')">
        <Plus :size="14" aria-hidden="true" />
      </button>
    </div>

    <div class="rail-foot">
      <!-- Files the reader couldn't show (#0071); absent when there are none. -->
      <button
        v-if="props.skippedCount"
        type="button"
        class="rail-nav rail-skipped"
        :title="skippedLabel(props.skippedCount)"
        @click="emit('skipped')"
      >
        <FileWarning class="rail-icon-glyph" :size="16" aria-hidden="true" />
        <span class="rail-name">{{ skippedLabel(props.skippedCount) }}</span>
      </button>
      <RouterLink class="rail-nav" :to="{ path: '/help', query: { from: props.workspace?.id } }" title="Help (?)">
        <CircleHelp class="rail-icon-glyph" :size="16" aria-hidden="true" />
        <span class="rail-name">Help</span>
        <kbd>?</kbd>
      </RouterLink>
      <button type="button" class="rail-icon" title="Settings" aria-label="Settings" @click="emit('settings')">
        <Settings :size="15" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="rail-icon"
        :title="collapsed ? 'Expand sidebar ([)' : 'Collapse sidebar ([)'"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="collapsed = !collapsed"
      >
        <PanelLeftOpen v-if="collapsed" :size="15" aria-hidden="true" />
        <PanelLeftClose v-else :size="15" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.inbox-rail {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 10px 8px 0;
  background: var(--bg-subtle);
  overflow-y: auto;
  overflow-x: hidden;
}
.inbox-rail > * { flex: 0 0 auto; }

.rail-head { display: flex; align-items: center; gap: 4px; padding: 0 0 8px; }
.rail-head :deep(.ws-switch) { flex: 1; min-width: 0; }
.live-status { display: flex; flex: 0 0 auto; }

.rail-icon {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--r);
  background: transparent;
  color: var(--text-3);
}
.rail-icon:hover { background: var(--bg-hover); color: var(--text); }

.rail-search-wrap { position: relative; margin: 0 0 8px; }
.rail-search-icon { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); color: var(--text-4); pointer-events: none; }
.rail-search { width: 100%; height: 30px; padding: 0 28px 0 29px; background: var(--surface); }
.rail-search-wrap kbd { position: absolute; right: 7px; top: 50%; transform: translateY(-50%); pointer-events: none; }

.rail-group { display: grid; gap: 1px; }
.rail-sec { display: flex; align-items: center; justify-content: space-between; height: 28px; margin-top: 12px; padding: 0 4px 0 9px; }
.rail-sec-label { font-size: 11.5px; font-weight: 500; color: var(--text-3); }
.rail-sec-add { display: grid; place-items: center; width: 22px; height: 22px; padding: 0; border: 0; border-radius: var(--r-sm); background: transparent; color: var(--text-3); }
.rail-sec-add:hover { background: var(--bg-hover); color: var(--text); }

.rail-nav {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--r);
  background: transparent;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
}
.rail-nav:hover { background: var(--bg-hover); color: var(--text); }
.rail-nav.on { background: var(--bg-active); color: var(--text); }
.rail-icon-glyph { flex: 0 0 auto; color: var(--text-3); }
.rail-nav.on .rail-icon-glyph { color: var(--text); }
.rail-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rail-count { font-size: 11.5px; font-weight: 400; color: var(--text-4); white-space: nowrap; font-variant-numeric: tabular-nums; }
.rail-count.hot { min-width: 18px; padding: 0 6px; border-radius: 999px; background: var(--accent); color: var(--on-accent); font-weight: 600; text-align: center; line-height: 18px; }

.rail-row { display: flex; align-items: center; border-radius: var(--r); }
.rail-row:hover { background: var(--bg-hover); }
.rail-row .rail-nav { flex: 1; min-width: 0; }
.rail-row .rail-nav:hover { background: transparent; }
.rail-row.on { background: var(--bg-active); }
.rail-row.on .rail-nav { color: var(--text); }
.rail-row .rail-dot { width: 10px; height: 10px; margin: 0 3px; }
.rail-pin {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin-right: 3px;
  padding: 0;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text-4);
  opacity: 0;
}
.rail-row:hover .rail-pin, .rail-row:focus-within .rail-pin, .rail-pin.on { opacity: 1; }
.rail-pin.on { color: var(--accent-text); }
.rail-pin:hover { background: var(--bg-active); color: var(--text); }

.rail-foot {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  margin-top: auto;
  padding: 10px 0;
  background: var(--bg-subtle);
}
.rail-foot .rail-nav { flex: 1; min-width: 0; }
.rail-foot .rail-skipped { flex: 0 0 100%; }
.rail-skipped .rail-icon-glyph { color: var(--amber-text); }

/* Collapsed: icons only, labels in tooltips. */
.inbox-rail.collapsed { padding: 10px 6px 0; align-items: stretch; }
.collapsed .rail-head { flex-direction: column; gap: 6px; }
.collapsed .rail-head :deep(.ws-name), .collapsed .rail-head :deep(.ws-chevron) { display: none; }
.collapsed .rail-head :deep(.ws-current) { justify-content: center; padding: 4px; }
.collapsed .live-badge { position: relative; width: 10px; height: 10px; padding: 0; background: var(--amber); font-size: 0; }
/* A 24px target: the refresh button matters most when the board isn't live. */
.collapsed .live-badge::after { content: ""; position: absolute; inset: -7px; }
.collapsed .rail-nav { justify-content: center; padding: 0; }
.collapsed .rail-name, .collapsed .rail-count, .collapsed .prd-num, .collapsed .rail-pin, .collapsed kbd { display: none; }
.collapsed .rail-count.hot { display: block; position: absolute; margin: -14px 0 0 18px; min-width: 8px; height: 8px; padding: 0; font-size: 0; line-height: 0; }
.collapsed .rail-nav { position: relative; }
.collapsed .rail-sec { justify-content: center; height: 12px; padding: 0; }
.collapsed .rail-sec-label, .collapsed .rail-sec-add { display: none; }
.collapsed .rail-sec::after { content: ""; width: 16px; height: 1px; background: var(--border); }
.collapsed .rail-foot { flex-direction: column; flex-wrap: nowrap; gap: 2px; }
.collapsed .rail-foot .rail-nav { flex: 0 0 auto; width: 100%; }
</style>
