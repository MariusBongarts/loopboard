<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ProjectPane from './ProjectPane.vue';
import IssueRefText from './IssueRefText.vue';
import { toneClass } from '../colors';
import {
  buildFeed,
  dayLabel,
  daysBetween,
  filterFeed,
  groupByDay,
  itemHeadline,
  needsYou,
  prdNumber,
  projectsByLastSession,
  relativeDay,
  searchFeed,
  searchProjects,
  splitNote,
  todayIso,
  type FeedItem,
  type InboxFilter,
} from '../inbox';
import { STANDALONE, tokenizeQuery, type ColumnKey, type Issue, type Project, type Spec } from '../types';
import SpecsView from './SpecsView.vue';

const props = defineProps<{ issues: Issue[]; projects: Project[]; specs: Spec[] }>();
const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'open-backlog', issues: Issue[]): void;
  (e: 'open-issue' | 'toggle-assignee', issue: Issue): void;
  (e: 'drop', payload: { issue: Issue; column: ColumnKey }): void;
  (e: 'reorder', payload: { column: ColumnKey; ids: string[]; draggedId: string }): void;
}>();

const SELECTED_KEY = 'tracker.inbox.selected';
const VIEW_KEY = 'tracker.inbox.view';

const RAIL_KEY = 'tracker.inbox.railWidth';
const RAIL_DEFAULT = 248;
const RAIL_MIN = 180;
const RAIL_MAX = 460;

const clampRail = (w: number) => Math.round(Math.min(RAIL_MAX, Math.max(RAIL_MIN, w)));
const railWidth = ref(readRailWidth());
function readRailWidth(): number {
  try {
    const n = Number(localStorage.getItem(RAIL_KEY));
    return n ? clampRail(n) : RAIL_DEFAULT;
  } catch {
    return RAIL_DEFAULT;
  }
}
const inboxEl = ref<HTMLElement | null>(null);
function onResizeStart(e: PointerEvent) {
  const handle = e.currentTarget as HTMLElement;
  handle.setPointerCapture(e.pointerId);
  const left = inboxEl.value?.getBoundingClientRect().left ?? 0;
  const move = (ev: PointerEvent) => {
    railWidth.value = clampRail(ev.clientX - left);
  };
  const up = () => {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', up);
    try {
      localStorage.setItem(RAIL_KEY, String(railWidth.value));
    } catch {
      /* ignore */
    }
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
}
function resetRailWidth() {
  railWidth.value = RAIL_DEFAULT;
  try {
    localStorage.removeItem(RAIL_KEY);
  } catch {
    /* ignore */
  }
}

const query = ref('');
const tokens = computed(() => tokenizeQuery(query.value));
const searchInput = ref<HTMLInputElement | null>(null);

type View = 'feed' | 'specs';
const view = ref<View>(readView());
function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'specs' ? 'specs' : 'feed';
  } catch {
    return 'feed';
  }
}
watch(view, (v) => {
  try {
    localStorage.setItem(VIEW_KEY, v);
  } catch {
    /* ignore */
  }
});
const DAY_PAGE = 8;

const FILTERS: { key: InboxFilter; label: string; title: string }[] = [
  { key: 'all', label: 'All', title: 'Inbox' },
  { key: 'you', label: 'Needs you', title: 'Needs you' },
  { key: 'sessions', label: 'Sessions', title: 'Sessions' },
  { key: 'issues', label: 'Issues', title: 'Issues' },
];

const today = todayIso();
const filter = ref<InboxFilter>('all');
// Rail project narrows the feed; null shows every project.
const scope = ref<string | null>(null);
const selectedKey = ref<string | null>(readSelected());
// Project tag clicks show that board until another item is selected.
const openOverride = ref<string | null>(null);
const dayLimit = ref(DAY_PAGE);
const scrollEl = ref<HTMLElement | null>(null);
const sentinel = ref<HTMLElement | null>(null);

function readSelected(): string | null {
  try {
    return localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}
watch(selectedKey, (k) => {
  try {
    if (k) localStorage.setItem(SELECTED_KEY, k);
  } catch {
    /* ignore */
  }
});

const projectsBySlug = computed(() => new Map(props.projects.map((p) => [p.slug, p])));
const feed = computed(() => buildFeed(props.issues, props.projects));
const visible = computed(() =>
  searchFeed(filterFeed(feed.value, filter.value, scope.value), tokens.value, projectsBySlug.value),
);
const days = computed(() => groupByDay(visible.value));
const shownDays = computed(() => days.value.slice(0, dayLimit.value));

const counts = computed(() => ({
  all: feed.value.length,
  you: props.issues.filter(needsYou).length,
  sessions: feed.value.filter((e) => e.kind === 'session').length,
  issues: feed.value.filter((e) => e.kind === 'issue').length,
}));

const railProjects = computed(() => searchProjects(props.projects, tokens.value));
const railActive = computed(() =>
  projectsByLastSession(railProjects.value.filter((p) => p.status !== 'shipped' && p.status !== 'paused')),
);
const railPaused = computed(() => projectsByLastSession(railProjects.value.filter((p) => p.status === 'paused')));

const selected = computed<FeedItem | null>(
  () => feed.value.find((e) => e.key === selectedKey.value) ?? null,
);

// Land on the newest item when nothing (or a stale key) is selected.
watch(
  visible,
  (list) => {
    if (selected.value || list.length === 0) return;
    selectedKey.value = list[0].key;
  },
  { immediate: true },
);

const paneKey = computed(() => openOverride.value ?? selected.value?.projectKey ?? null);
const paneProject = computed<Project | null>(() =>
  paneKey.value && paneKey.value !== STANDALONE ? projectsBySlug.value.get(paneKey.value) ?? null : null,
);
const paneValid = computed(() => paneKey.value === STANDALONE || paneProject.value !== null);
const pinned = computed(() =>
  selected.value && selected.value.projectKey === paneKey.value ? selected.value : null,
);
const highlightId = computed(() => (pinned.value?.kind === 'issue' ? pinned.value.issue.id : null));
const pinnedLabel = computed(() => {
  const p = pinned.value;
  if (!p) return '';
  return p.kind === 'issue' ? `Selected issue · #${p.issue.id}` : `Session · ${dayLabel(p.date, today)}`;
});

const listTitle = computed(() =>
  query.value.trim()
    ? `Results for “${query.value.trim()}”`
    : scope.value
    ? projectTitle(scope.value)
    : FILTERS.find((f) => f.key === filter.value)?.title ?? 'Inbox',
);

function projectTitle(key: string): string {
  return key === STANDALONE ? 'Standalone' : projectsBySlug.value.get(key)?.title ?? key;
}

function resetList() {
  dayLimit.value = DAY_PAGE;
  scrollEl.value?.scrollTo({ top: 0 });
}

function setFilter(f: InboxFilter) {
  view.value = 'feed';
  filter.value = f;
  scope.value = null;
  openOverride.value = null;
  resetList();
  selectedKey.value = visible.value[0]?.key ?? selectedKey.value;
}

function setChip(f: InboxFilter) {
  filter.value = f;
  resetList();
  if (!visible.value.some((e) => e.key === selectedKey.value)) {
    selectedKey.value = visible.value[0]?.key ?? selectedKey.value;
  }
}

function scopeTo(slug: string) {
  view.value = 'feed';
  scope.value = slug;
  filter.value = 'all';
  openOverride.value = null;
  resetList();
  selectedKey.value = visible.value[0]?.key ?? selectedKey.value;
  if (!visible.value.length) openOverride.value = slug;
}

function select(item: FeedItem) {
  selectedKey.value = item.key;
  openOverride.value = null;
}

function openProject(key: string) {
  openOverride.value = key;
}

async function move(delta: number) {
  const list = visible.value;
  const idx = list.findIndex((e) => e.key === selectedKey.value);
  const next = list[Math.max(0, Math.min(list.length - 1, idx + delta))];
  if (!next) return;
  select(next);
  const dayIdx = days.value.findIndex((d) => d.items.includes(next));
  if (dayIdx >= dayLimit.value) dayLimit.value = dayIdx + DAY_PAGE;
  await nextTick();
  scrollEl.value
    ?.querySelector(`[data-key="${CSS.escape(next.key)}"]`)
    ?.scrollIntoView({ block: 'nearest' });
}

watch(query, () => {
  view.value = 'feed';
  resetList();
  if (!visible.value.some((e) => e.key === selectedKey.value) && visible.value[0]) {
    selectedKey.value = visible.value[0].key;
    openOverride.value = null;
  }
});

function onKeydown(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '/' && !document.querySelector('.drawer')) {
    e.preventDefault();
    searchInput.value?.focus();
    searchInput.value?.select();
    return;
  }
  if (view.value !== 'feed' || document.querySelector('.drawer')) return;
  if (e.key === 'j') move(1);
  else if (e.key === 'k') move(-1);
}

function openById(id: string) {
  const issue =
    props.issues.find((i) => i.id === id && !i.archived) ?? props.issues.find((i) => i.id === id);
  if (issue) emit('open-issue', issue);
}

function isFresh(date: string): boolean {
  return !!date && daysBetween(date, today) <= 1;
}

function sessionRest(item: FeedItem): string {
  return item.kind === 'session' ? splitNote(item.note)[1] : '';
}

let observer: IntersectionObserver | null = null;
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting) && dayLimit.value < days.value.length) {
        dayLimit.value += DAY_PAGE;
      }
    },
    { root: scrollEl.value, rootMargin: '300px' },
  );
  if (sentinel.value) observer.observe(sentinel.value);
  window.addEventListener('keydown', onKeydown);
});

// Issues load after mount: reveal the remembered item once it exists.
let revealed = false;
watch(
  selected,
  async (item) => {
    if (revealed || !item) return;
    revealed = true;
    const dayIdx = days.value.findIndex((d) => d.items.includes(item));
    if (dayIdx >= dayLimit.value) dayLimit.value = dayIdx + DAY_PAGE;
    await nextTick();
    scrollEl.value
      ?.querySelector(`[data-key="${CSS.escape(item.key)}"]`)
      ?.scrollIntoView({ block: 'center' });
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div class="inbox" :class="{ 'inbox-specs-mode': view === 'specs' }">
    <nav class="inbox-rail" aria-label="Inbox navigation">
      <div class="rail-head">
        <span class="rail-brand">Issue <em>Tracker</em></span>
        <button type="button" class="rail-refresh" title="Re-read files from disk" @click="emit('refresh')">
          Refresh
        </button>
      </div>
      <button
        v-for="f in FILTERS"
        :key="f.key"
        type="button"
        class="rail-nav"
        :class="{ on: view === 'feed' && filter === f.key && !scope }"
        @click="setFilter(f.key)"
      >
        <span class="rail-name">{{ f.title }}</span>
        <span class="rail-count" :class="{ hot: f.key === 'you' && counts.you > 0 }">{{ counts[f.key] }}</span>
      </button>
      <button
        type="button"
        class="rail-nav"
        :class="{ on: view === 'specs' }"
        @click="view = 'specs'"
      >
        <span class="rail-name">Specs</span>
        <span class="rail-count">{{ props.specs.length }}</span>
      </button>
      <div class="rail-sec">Projects · last session</div>
      <button
        v-for="p in railActive"
        :key="p.slug"
        type="button"
        class="rail-nav"
        :class="{ on: view === 'feed' && scope === p.slug }"
        @click="scopeTo(p.slug)"
      >
        <span class="rail-dot" :class="toneClass(p.slug)" />
        <span class="rail-name">{{ p.title }}</span>
        <span class="rail-count">{{ relativeDay(p.lastSession, today) }}</span>
      </button>
      <template v-if="railPaused.length">
        <div class="rail-sec">Paused</div>
        <button
          v-for="p in railPaused"
          :key="p.slug"
          type="button"
          class="rail-nav"
          :class="{ on: view === 'feed' && scope === p.slug }"
          @click="scopeTo(p.slug)"
        >
          <span class="rail-dot" :class="toneClass(p.slug)" />
          <span class="rail-name">{{ p.title }}</span>
          <span class="rail-count">{{ relativeDay(p.lastSession, today) }}</span>
        </button>
      </template>
    </nav>

    <section v-if="view === 'specs'" class="inbox-specs">
      <SpecsView :specs="props.specs" />
    </section>

    <section v-show="view === 'feed'" class="inbox-list" aria-label="Activity">
      <header class="list-head">
        <div class="list-head-row">
          <h2>{{ listTitle }}</h2>
          <button v-if="scope" type="button" class="list-clear" @click="setFilter(filter)">All projects</button>
        </div>
        <div class="list-filters">
          <button
            v-for="f in FILTERS"
            :key="f.key"
            type="button"
            class="fchip"
            :class="{ on: filter === f.key }"
            @click="setChip(f.key)"
          >{{ f.label }}</button>
        </div>
      </header>

      <div ref="scrollEl" class="list-scroll">
        <p v-if="visible.length === 0" class="list-empty">Nothing here.</p>
        <section v-for="d in shownDays" :key="d.date || 'none'" class="feed-day">
          <h3 class="feed-day-head">
            <span>{{ dayLabel(d.date, today) }}</span>
            <span>{{ d.items.length }} {{ d.items.length === 1 ? 'item' : 'items' }}</span>
          </h3>
          <div
            v-for="item in d.items"
            :key="item.key"
            class="feed-row"
            :class="{ on: item.key === selectedKey }"
            :data-key="item.key"
            role="button"
            tabindex="0"
            @click="select(item)"
            @dblclick="item.kind === 'issue' && emit('open-issue', item.issue)"
            @keydown.enter.prevent="select(item)"
          >
            <span class="feed-unread" :class="{ fresh: isFresh(item.date) }" />
            <div class="feed-main">
              <div class="feed-l1">
                <button
                  type="button"
                  class="feed-proj"
                  :title="`Open the ${projectTitle(item.projectKey)} board`"
                  @click.stop="openProject(item.projectKey)"
                >
                  <span class="rail-dot" :class="item.projectKey === STANDALONE ? '' : toneClass(item.projectKey)" />
                  {{ projectTitle(item.projectKey) }}
                </button>
                <span class="feed-kind">{{ item.kind === 'session' ? 'Session' : `#${item.issue.id}` }}</span>
              </div>
              <div class="feed-title">{{ itemHeadline(item) }}</div>
              <div v-if="item.kind === 'issue'" class="feed-sub">
                <span class="feed-status" :class="`s-${item.issue.status}`">{{ item.issue.status }}</span>
                <span class="feed-who" :class="item.issue.assignee">{{ item.issue.assignee }}</span>
              </div>
              <div v-else-if="sessionRest(item)" class="feed-rest">{{ sessionRest(item) }}</div>
            </div>
            <span class="feed-when">{{ relativeDay(item.date, today) }}</span>
          </div>
        </section>
        <div ref="sentinel" class="list-sentinel">
          <template v-if="dayLimit < days.length">Loading earlier days…</template>
          <template v-else-if="visible.length">That's everything.</template>
        </div>
      </div>
    </section>

    <section v-show="view === 'feed'" class="inbox-pane">
      <ProjectPane
        v-if="paneValid"
        :project="paneProject"
        :issues="props.issues"
        :today="today"
        :highlight-id="highlightId"
        :pinned-label="pinnedLabel"
        @open-issue="(i) => emit('open-issue', i)"
        @open-backlog="(list) => emit('open-backlog', list)"
        @open-id="openById"
        @toggle-assignee="(i) => emit('toggle-assignee', i)"
        @drop="(p) => emit('drop', p)"
        @reorder="(p) => emit('reorder', p)"
      >
        <template v-if="pinned" #pinned>
          <div class="pinned-callout">
            <template v-if="pinned.kind === 'issue'">
              <div class="pinned-main">
                <button type="button" class="pinned-title" @click="emit('open-issue', pinned.issue)">
                  {{ pinned.issue.title }}
                </button>
              </div>
              <span class="feed-status" :class="`s-${pinned.issue.status}`">{{ pinned.issue.status }}</span>
              <span class="feed-who" :class="pinned.issue.assignee">{{ pinned.issue.assignee }}</span>
            </template>
            <div v-else class="pinned-main">
              <p class="pinned-note"><IssueRefText :text="pinned.note" @open-id="openById" /></p>
            </div>
          </div>
        </template>
      </ProjectPane>
      <p v-else class="list-empty">Select an item to see its project's board.</p>
    </section>
  </div>
</template>
