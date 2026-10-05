<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppRail from './AppRail.vue';
import IssuePage from './IssuePage.vue';
import ResizeHandle from './ResizeHandle.vue';
import { ScrollText } from '@lucide/vue';
import Avatar from './Avatar.vue';
import { useIssueContextMenu } from '../issueContext';
import StatusIcon from './StatusIcon.vue';
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
  projectsByLastSession,
  readPinnedSlugs,
  relativeDay,
  searchFeed,
  searchProjects,
  splitPinnedProjects,
  togglePinnedSlug,
  splitNote,
  todayIso,
  type FeedItem,
  type InboxFilter,
} from '../inbox';
import {
  STANDALONE,
  tokenizeQuery,
  type ColumnKey,
  type Issue,
  type Project,
  type Spec,
  type WorkspaceSummary,
} from '../types';
import SpecsView from './SpecsView.vue';
import { useRoute, useRouter } from 'vue-router';
import { useResizable } from '../resize';
import { readStored, readWorkspaceStored, writeStored, writeWorkspaceStored } from '../storage';
import { useWorkspace, type View } from '../workspace';
import ProjectsView from './ProjectsView.vue';
import ListView from './ListView.vue';
import type { LiveState } from '../live';
import { hasModifier, isShortcut, isTyping, overlayOpen } from '../shortcuts';

const props = defineProps<{
  view: View;
  workspace: WorkspaceSummary | null;
  live: LiveState;
  issues: Issue[];
  projects: Project[];
  specs: Spec[];
  request: { slug: string; tab: 'board' | 'prd'; nonce: number } | null;
}>();
const router = useRouter();
const route = useRoute();
const { id: workspaceId } = useWorkspace();
const contextMenu = useIssueContextMenu();
const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'open-backlog', issues: Issue[]): void;
  (e: 'open-issue', issue: Issue, list?: Issue[]): void;
  (e: 'toggle-assignee', issue: Issue): void;
  (e: 'drop', payload: { issue: Issue; column: ColumnKey }): void;
  (e: 'reorder', payload: { column: ColumnKey; ids: string[]; draggedId: string }): void;
  (e: 'selection', issue: Issue | null): void;
  (e: 'pane-project', slug: string | null): void;
  (e: 'new-issue' | 'new-project' | 'settings'): void;
}>();

const SELECTED_KEY = 'inbox.selected';

const PIN_KEY = 'inbox.pinnedProjects';
// Rail and feed resize the same way (#0048).
const railResizer = useResizable({ key: 'loopboard.railWidth', min: 180, max: 460, initial: 248, edge: 'right' });
const feedResizer = useResizable({ key: 'loopboard.feedWidth', min: 280, max: 600, initial: 380, edge: 'right' });
const railCollapsed = ref(readStored('loopboard.railCollapsed') === '1');
watch(railCollapsed, (c) => writeStored('loopboard.railCollapsed', c ? '1' : null));
const railCssWidth = computed(() => (railCollapsed.value ? '52px' : `${railResizer.size.value}px`));
const rail = ref<InstanceType<typeof AppRail> | null>(null);

const query = ref('');
const tokens = computed(() => tokenizeQuery(query.value));
const specsView = ref<InstanceType<typeof SpecsView> | null>(null);

const view = computed(() => props.view);
// The route owns the view (#0008): /w/:ws is the feed, /w/:ws/specs the specs.
function showView(v: View) {
  if (v === props.view) return;
  router.push(v === 'feed' ? `/w/${workspaceId.value}` : `/w/${workspaceId.value}/${v}`);
}

function openFromOverview(slug: string) {
  showView('feed');
  openOverride.value = slug;
}
const DAY_PAGE = 8;

const FILTERS: { key: InboxFilter; label: string; title: string }[] = [
  { key: 'all', label: 'All', title: 'Inbox' },
  { key: 'you', label: 'Needs you', title: 'Needs you' },
  { key: 'sessions', label: 'Sessions', title: 'Sessions' },
  { key: 'issues', label: 'Issues', title: 'Issues' },
];

// Hide the feed to give the board the full width; remembered per browser.
const feedHidden = ref(readStored('loopboard.feedHidden') === '1');
watch(feedHidden, (h) => writeStored('loopboard.feedHidden', h ? '1' : null));

const { views } = useWorkspace();

function openIssues(query: Record<string, string> = {}) {
  router.push({ path: `/w/${workspaceId.value}/issues`, query });
}

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
  // A link like /w/:ws?item=i:0042 (from the cross-workspace view) wins.
  if (typeof route.query.item === 'string') return route.query.item;
  return readWorkspaceStored(workspaceId.value, SELECTED_KEY);
}
watch(selectedKey, (k) => {
  if (k) writeWorkspaceStored(workspaceId.value, SELECTED_KEY, k);
});

const projectsBySlug = computed(() => new Map(props.projects.map((p) => [p.slug, p])));
const feed = computed(() => buildFeed(props.issues, props.projects));
const visible = computed(() =>
  searchFeed(filterFeed(feed.value, filter.value, scope.value), tokens.value, projectsBySlug.value),
);
const days = computed(() => groupByDay(visible.value));
const visibleIssues = computed(() => visible.value.flatMap((e) => (e.kind === 'issue' ? [e.issue] : [])));
const shownDays = computed(() => days.value.slice(0, dayLimit.value));

const counts = computed(() => ({
  all: feed.value.length,
  you: props.issues.filter(needsYou).length,
  sessions: feed.value.filter((e) => e.kind === 'session').length,
  issues: feed.value.filter((e) => e.kind === 'issue').length,
}));

const pinnedSlugs = ref(readPins());
function readPins(): string[] {
  return readPinnedSlugs(readWorkspaceStored(workspaceId.value, PIN_KEY));
}
function togglePin(slug: string) {
  pinnedSlugs.value = togglePinnedSlug(pinnedSlugs.value, slug);
  writeWorkspaceStored(workspaceId.value, PIN_KEY, JSON.stringify(pinnedSlugs.value));
}

const railProjects = computed(() => searchProjects(props.projects, tokens.value));
const railSections = computed(() => {
  const visible = railProjects.value.filter((p) => p.status !== 'shipped');
  const { pinned, rest } = splitPinnedProjects(visible, pinnedSlugs.value);
  const sections: { label: string; projects: Project[] }[] = [];
  if (pinned.length) sections.push({ label: 'Pinned', projects: pinned });
  const active = projectsByLastSession(rest.filter((p) => p.status !== 'paused'));
  if (active.length) sections.push({ label: 'Projects · last session', projects: active });
  const paused = projectsByLastSession(rest.filter((p) => p.status === 'paused'));
  if (paused.length) sections.push({ label: 'Paused', projects: paused });
  return sections;
});

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
watch(
  () => (selected.value?.kind === 'issue' ? selected.value.issue : null),
  (issue) => emit('selection', issue),
  { immediate: true },
);
watch(
  () => (paneKey.value && paneKey.value !== STANDALONE ? paneKey.value : null),
  (slug) => emit('pane-project', slug),
  { immediate: true },
);
// "Show this project" from ⌘K or after creating one (#0020, #0021).
watch(
  () => props.request?.nonce,
  () => {
    if (!props.request) return;
    showView('feed');
    openOverride.value = props.request.slug;
  },
);
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
  showView('feed');
  feedHidden.value = false;
  filter.value = f;
  scope.value = null;
  openOverride.value = null;
  resetList();
  selectedKey.value = visible.value[0]?.key ?? selectedKey.value;
}

function scopeTo(slug: string) {
  showView('feed');
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
  showView('feed');
  resetList();
  if (!visible.value.some((e) => e.key === selectedKey.value) && visible.value[0]) {
    selectedKey.value = visible.value[0].key;
    openOverride.value = null;
  }
});

function onKeydown(e: KeyboardEvent) {
  if (isTyping(e) || hasModifier(e)) return;
  const overlay = overlayOpen();
  if (isShortcut(e, 'search') && !overlay) {
    e.preventDefault();
    // In the Specs view "/" searches scenarios, not the feed.
    if (view.value === 'specs') specsView.value?.focusSearch();
    else void rail.value?.focusSearch();
    return;
  }
  if (isShortcut(e, 'sidebar') && !overlay) {
    e.preventDefault();
    railCollapsed.value = !railCollapsed.value;
    return;
  }
  if (view.value !== 'feed' || overlay) return;
  if (isShortcut(e, 'next')) move(1);
  else if (isShortcut(e, 'prev')) move(-1);
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
  <div
    class="inbox"
    :class="{ 'inbox-specs-mode': view !== 'feed', 'feed-hidden': feedHidden && view === 'feed' }"
    :style="{ '--rail-w': railCssWidth, '--feed-w': `${feedResizer.size.value}px` }"
  >
    <AppRail
      ref="rail"
      v-model:query="query"
      v-model:collapsed="railCollapsed"
      :workspace="props.workspace"
      :live="props.live"
      :view="view"
      :filter="filter"
      :scope="scope"
      :counts="counts"
      :projects-count="props.projects.length"
      :specs-count="props.specs.length"
      :sections="railSections"
      :pinned="pinnedSlugs"
      :views="views"
      :active-view-id="typeof route.query.view === 'string' ? route.query.view : null"
      :today="today"
      @refresh="emit('refresh')"
      @new-issue="emit('new-issue')"
      @new-project="emit('new-project')"
      @settings="emit('settings')"
      @open-issues="openIssues()"
      @set-filter="setFilter"
      @scope="scopeTo"
      @toggle-pin="togglePin"
      @show-view="showView"
      @open-view="(v) => openIssues({ ...v.query, view: v.id })"
    />

    <section v-if="view === 'issues'" class="inbox-specs">
      <ListView />
    </section>
    <section v-else-if="view === 'projects'" class="inbox-specs">
      <ProjectsView :projects="props.projects" :issues="props.issues" @open="openFromOverview" />
    </section>
    <section v-else-if="view === 'issue'" class="inbox-specs">
      <IssuePage :issue-id="String(route.params.id)" :archived="route.query.archived === '1'" :loaded="props.workspace !== null" />
    </section>
    <section v-else-if="view === 'specs'" class="inbox-specs">
      <SpecsView ref="specsView" :specs="props.specs" />
    </section>

    <section v-show="view === 'feed'" class="inbox-list" aria-label="Activity">
      <header class="list-head">
        <div class="list-head-row">
          <h2>{{ listTitle }}</h2>
          <button v-if="scope" type="button" class="list-clear" @click="setFilter(filter)">All projects</button>
          <button type="button" class="feed-toggle" title="Hide the feed — give the board the full width" aria-label="Hide feed" @click="feedHidden = true">⇤</button>
        </div>
      </header>

      <div ref="scrollEl" class="list-scroll">
        <div v-if="feed.length === 0" class="first-steps">
          <h3>Nothing here yet</h3>
          <p>Ask your agent, in this repo:</p>
          <ol>
            <li><q>Grill me on &lt;your idea&gt;</q> — it interviews you until the plan is clear.</li>
            <li><q>Write a PRD for this</q> — a project appears in the rail.</li>
            <li><q>Break it into issues</q> — they show up here as they're filed.</li>
          </ol>
          <p class="first-steps-own">
            Or file one yourself:
            <button type="button" class="first-steps-new" @click="emit('new-issue')">New issue</button> <kbd>C</kbd>
          </p>
          <RouterLink :to="{ path: '/help', query: { from: workspaceId } }">How the loop works →</RouterLink>
        </div>
        <p v-else-if="visible.length === 0" class="list-empty">Nothing here.</p>
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
            @dblclick="item.kind === 'issue' && emit('open-issue', item.issue, visibleIssues)"
            @contextmenu="(e: MouseEvent) => { if (item.kind === 'issue') { e.preventDefault(); contextMenu.open(e, item.issue); } }"
            @keydown.enter.prevent="select(item)"
          >
            <span class="feed-unread" :class="{ fresh: isFresh(item.date) }" />
            <span class="feed-icon" aria-hidden="true">
              <StatusIcon v-if="item.kind === 'issue'" :status="item.issue.status" />
              <ScrollText v-else :size="14" />
            </span>
            <div class="feed-main">
              <div class="feed-title">{{ itemHeadline(item) }}</div>
              <div class="feed-l2">
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
                <Avatar v-if="item.kind === 'issue'" :assignee="item.issue.assignee" :size="16" />
              </div>
              <div v-if="item.kind === 'session' && sessionRest(item)" class="feed-rest">{{ sessionRest(item) }}</div>
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
      <button v-if="feedHidden" type="button" class="feed-toggle feed-show" title="Show the feed" aria-label="Show feed" @click="feedHidden = false">⇥ Feed</button>
      <ProjectPane
        v-if="paneValid"
        :project="paneProject"
        :issues="props.issues"
        :today="today"
        :highlight-id="highlightId"
        :pinned-label="pinnedLabel"
        :request-tab="props.request && props.request.slug === paneKey ? props.request : null"
        @open-issue="(i, list) => emit('open-issue', i, list)"
        @open-backlog="(list) => emit('open-backlog', list)"
        @open-id="openById"
        @toggle-assignee="(i) => emit('toggle-assignee', i)"
        @drop="(p) => emit('drop', p)"
        @reorder="(p) => emit('reorder', p)"
      >
        <template v-if="pinned?.kind === 'issue'" #pinned-badge>
          <StatusIcon :status="pinned.issue.status" :size="12" /><span class="badge-pop-id">#{{ pinned.issue.id }}</span>
        </template>
        <template v-if="pinned" #pinned>
          <div class="pinned-callout">
            <template v-if="pinned.kind === 'issue'">
              <div class="pinned-main">
                <button type="button" class="pinned-title" @click="emit('open-issue', pinned.issue)">
                  {{ pinned.issue.title }}
                </button>
              </div>
              <StatusIcon :status="pinned.issue.status" />
              <Avatar :assignee="pinned.issue.assignee" />
            </template>
            <div v-else class="pinned-main">
              <p class="pinned-note"><IssueRefText :text="pinned.note" @open-id="openById" /></p>
            </div>
          </div>
        </template>
      </ProjectPane>
      <p v-else class="list-empty">
        {{ feed.length === 0 ? 'The board appears here once there are issues.' : "Select an item to see its project's board." }}
      </p>
    </section>
    <ResizeHandle v-if="!railCollapsed" class="rail-resizer" :resizer="railResizer" label="Resize sidebar" />
    <ResizeHandle v-if="view === 'feed' && !feedHidden" class="feed-resizer" :resizer="feedResizer" label="Resize feed" />
  </div>
</template>
