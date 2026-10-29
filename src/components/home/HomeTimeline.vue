<script setup lang="ts">
import { toneClass } from '../../colors';
import type { HomeDay } from '../../home';
import { dayLabel } from '../../inbox';
import Avatar from '../Avatar.vue';
import ProjectBadge from '../ProjectBadge.vue';
import StatusIcon from '../StatusIcon.vue';
import IssueChip from './IssueChip.vue';
import IssueLine from './IssueLine.vue';
import PeekLink from './PeekLink.vue';
import RunDot from './RunDot.vue';
import RunTag from './RunTag.vue';

// Home's timeline (#0127, #0128): runs with what they filed and mentioned,
// sessions and hand-filed issues, grouped by day. Quiet runs take one line.
const props = defineProps<{ days: HomeDay[]; today: string }>();
</script>

<template>
  <div class="timeline">
    <section v-for="d in props.days" :key="d.day" class="tl-day" :aria-label="dayLabel(d.day, props.today)">
      <header class="tl-day-head">
        <strong>{{ dayLabel(d.day, props.today) }}</strong>
        <span>{{ d.entries.length }} {{ d.entries.length === 1 ? 'event' : 'events' }}</span>
      </header>
      <div v-for="e in d.entries" :key="e.key" class="tl-entry" :class="[e.kind, { quiet: e.kind === 'run' && e.collapsed }]" :data-key="e.key">
        <template v-if="e.kind === 'run'">
          <span class="tl-time">{{ e.time }}</span>
          <span class="tl-glyph"><RunDot :tone="e.tone" /></span>
          <div class="tl-body">
            <div class="tl-head">
              <span v-if="e.isNew" class="tl-new" title="New since your last visit" />
              <PeekLink class="tl-title" :to="{ kind: 'run', slug: e.routine.slug, key: e.link }">{{ e.routine.title }}</PeekLink>
              <RunTag v-if="e.tone !== 'ok'" :status="e.run.status" />
              <PeekLink v-if="e.collapsed" class="tl-inline" :to="{ kind: 'run', slug: e.routine.slug, key: e.link }">{{ e.summary }}</PeekLink>
            </div>
            <template v-if="!e.collapsed">
              <PeekLink class="tl-summary" :to="{ kind: 'run', slug: e.routine.slug, key: e.link }">{{ e.summary }}</PeekLink>
              <div v-if="e.filed.length" class="tl-filed">
                <span class="tl-label">Filed</span>
                <IssueLine v-for="i in e.filed" :key="i.id" :issue="i"><ProjectBadge v-if="i.project" :slug="i.project" /></IssueLine>
              </div>
              <div v-if="e.mentioned.length" class="tl-chips">
                <span class="tl-label">Mentions</span>
                <IssueChip v-for="i in e.mentioned.slice(0, 4)" :key="i.id" :issue="i" mention />
                <PeekLink v-if="e.mentioned.length > 4" class="tl-more" :to="{ kind: 'run', slug: e.routine.slug, key: e.link }">+{{ e.mentioned.length - 4 }}</PeekLink>
              </div>
            </template>
          </div>
        </template>

        <template v-else-if="e.kind === 'session'">
          <span class="tl-time" />
          <span class="tl-glyph"><span class="project-badge" :class="toneClass(e.project.slug)" :title="e.project.title"><span class="project-badge-mark" /></span></span>
          <div class="tl-body">
            <div class="tl-head">
              <span v-if="e.isNew" class="tl-new" title="New since your last visit" />
              <PeekLink class="tl-title" :to="{ kind: 'project', slug: e.project.slug }">{{ e.project.title }}</PeekLink>
              <span class="tl-kind">session</span>
            </div>
            <PeekLink class="tl-summary" :to="{ kind: 'project', slug: e.project.slug }">{{ e.summary }}</PeekLink>
            <div v-if="e.mentioned.length" class="tl-chips">
              <IssueChip v-for="i in e.mentioned.slice(0, 4)" :key="i.id" :issue="i" mention />
            </div>
          </div>
        </template>

        <template v-else>
          <span class="tl-time" />
          <span class="tl-glyph"><StatusIcon :status="e.issue.status" /></span>
          <div class="tl-body">
            <div class="tl-head">
              <span v-if="e.isNew" class="tl-new" title="New since your last visit" />
              <PeekLink class="tl-title" :to="{ kind: 'issue', id: e.issue.id }"><span class="tl-id">#{{ e.issue.id }}</span> {{ e.issue.title }}</PeekLink>
            </div>
            <div class="tl-meta">
              <span class="tl-kind">filed</span>
              <ProjectBadge v-if="e.issue.project" :slug="e.issue.project" />
              <Avatar v-if="e.issue.assignee === 'human'" assignee="human" />
            </div>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tl-day { margin-bottom: 8px; }
.tl-day-head { position: sticky; top: 0; z-index: 2; display: flex; align-items: baseline; gap: 10px; padding: 12px 0 6px; background: var(--bg); border-bottom: 1px solid var(--border-subtle); }
.tl-day-head strong { font-size: 13px; font-weight: 600; }
.tl-day-head span { font-size: 12px; color: var(--text-4); }
.tl-entry { display: grid; grid-template-columns: 40px 18px minmax(0, 1fr); gap: 0 10px; padding: 9px 0; }
.tl-time { padding-top: 1px; font: 11.5px var(--mono); color: var(--text-4); text-align: right; }
.tl-glyph { position: relative; display: grid; place-items: center; height: 18px; }
.tl-glyph::after { content: ""; position: absolute; top: 20px; bottom: -16px; left: 50%; width: 1px; background: var(--border-subtle); }
.tl-entry:last-child .tl-glyph::after { display: none; }
.tl-body { min-width: 0; }
.tl-head { display: flex; align-items: center; gap: 8px; min-width: 0; }
.tl-title { flex: none; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; color: var(--text); text-decoration: none; }
.tl-title:hover, .tl-summary:hover, .tl-inline:hover { color: var(--accent-text); }
.tl-id { font: 500 12px var(--mono); color: var(--text-3); }
.tl-inline { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-3); text-decoration: none; }
.tl-summary { display: block; margin-top: 3px; color: var(--text-2); font-size: 13.5px; line-height: 1.5; text-decoration: none; }
.tl-kind { font-size: 12px; color: var(--text-4); }
.tl-meta { display: flex; align-items: center; gap: 8px; margin-top: 3px; }
.tl-filed { margin: 8px 0 2px; padding-left: 10px; border-left: 2px solid var(--border-subtle); }
.tl-filed :deep(.issue-line) { margin: 0; }
.tl-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; }
.tl-label { font-size: 11px; font-weight: 500; color: var(--text-4); }
.tl-filed .tl-label { display: block; margin: 2px 0; }
.tl-more { font-size: 12px; color: var(--text-3); text-decoration: none; }
.tl-new { flex: none; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
@media (max-width: 760px) {
  .tl-head { flex-wrap: wrap; }
  .tl-title { white-space: normal; }
}
</style>
