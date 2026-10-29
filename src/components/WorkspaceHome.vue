<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { HOME_PERIODS, PERIOD_LABEL } from '../home';
import { providePeek } from '../peek';
import { toast } from '../toast';
import { useHome } from '../useHome';
import { useWorkspace } from '../workspace';
import HomePreview from './home/HomePreview.vue';
import HomeSide from './home/HomeSide.vue';
import HomeTimeline from './home/HomeTimeline.vue';
import IssueHoverCard from './home/IssueHoverCard.vue';
import Segmented from './Segmented.vue';

// Home (project 06): what ran and what changed lately, as a timeline with
// routine health beside it. Everything opens a preview with its own link.
const props = defineProps<{ loaded: boolean }>();
const emit = defineEmits<{ (e: 'open-project', slug: string): void }>();
const route = useRoute();
const router = useRouter();
const { id: workspaceId, routines, routineCount } = useWorkspace();
const { home, period, now, today, markSeen } = useHome();
providePeek(router, route);

const root = ref<HTMLElement | null>(null);
const periods = HOME_PERIODS.map((value) => ({ value, label: PERIOD_LABEL[value] }));
const waiting = computed(() => !props.loaded || (routineCount.value > 0 && routines.value === null));

function seen() {
  markSeen();
  toast('Marked as seen');
}
</script>

<template>
  <section ref="root" class="home" aria-label="Home">
    <header class="home-head">
      <h2>Home</h2>
      <Segmented v-model="period" :options="periods" label="Period" />
      <span class="home-gap" />
      <button v-if="home.newCount" type="button" class="ghost home-seen" @click="seen">Mark all seen</button>
    </header>
    <div class="home-scroll">
      <div class="home-grid">
        <div class="home-main">
          <p v-if="waiting" class="home-empty">Loading…</p>
          <HomeTimeline v-else-if="home.days.length" :days="home.days" :today="today" />
          <div v-else class="home-empty">
            <p>Nothing happened {{ period === 'today' ? 'today' : `in the last ${PERIOD_LABEL[period]}` }}.</p>
            <p v-if="!routineCount">
              Recurring work — a morning check, a weekly report — can run on its own as a routine. Ask your agent to
              “create a routine that …”; each one is a folder in <code>.agents/scheduled/</code>.
            </p>
          </div>
        </div>
        <HomeSide :home="home" :today="today" :now="now" :workspace="workspaceId" />
      </div>
    </div>
    <HomePreview @open-project="(slug) => emit('open-project', slug)" />
    <IssueHoverCard :within="root" />
  </section>
</template>

<style scoped>
.home { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.home-head { display: flex; align-items: center; gap: 12px; height: 48px; flex: none; padding: 0 24px; border-bottom: 1px solid var(--border-subtle); }
.home-head h2 { margin: 0; font-size: 14px; font-weight: 600; }
.home-gap { flex: 1; }
.home-seen { font-size: 12px; }
.home-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.home-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 36px; max-width: 1180px; margin: 0 auto; padding: 12px 28px 80px; }
.home-grid :deep(.home-side) { position: sticky; top: 16px; align-self: start; }
.home-empty { padding: 24px 0; color: var(--text-3); font-size: 13.5px; line-height: 1.6; max-width: 520px; }
.home-empty p { margin: 0 0 8px; }
@media (max-width: 1000px) {
  .home-grid { grid-template-columns: minmax(0, 1fr); gap: 20px; }
  .home-grid :deep(.home-side) { position: static; grid-row: 1; }
}
@media (max-width: 760px) {
  .home-grid { padding: 12px 16px 60px; }
  .home-head { padding: 0 16px; }
}
</style>
