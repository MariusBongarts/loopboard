<script setup lang="ts">
import { ArrowRight, BookOpen, CircleArrowUp, Rocket } from '@lucide/vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import LoopDiagram from '../../components/LoopDiagram.vue';
import { SKILLS_REPO, videoSources } from '../../course';
import { helpLink } from '../../help';
import { resolvedTheme } from '../../theme';

// Help Center overview (#0063): the loop at a glance and a way into each page.
const route = useRoute();
const from = computed(() => route.query.from);
const chapterLink = (chapter: string) => helpLink('/help/learn', from.value, chapter);
const poster = computed(() => videoSources('loop', resolvedTheme.value).poster);

const MORE = [
  { path: '/help/setup', icon: Rocket, title: 'Set up a repo', text: 'One prompt for your agent; it runs init and fills in your commands.' },
  { path: '/help/upgrade', icon: CircleArrowUp, title: 'Upgrade a harness', text: 'See which repos are behind and copy the upgrade prompt.' },
  { path: '/help/reference', icon: BookOpen, title: 'Reference', text: 'The loop, what lives where, statuses, fields and shortcuts.' },
];
</script>

<template>
  <article class="hc-page wide">
    <header>
      <p class="hc-eyebrow">Help Center</p>
      <h1>Build with agents, steer from the board</h1>
      <p class="hc-lede">
        loopboard shows the issues, PRDs and specs you and your coding agents keep in your repo. Behind it is a
        loop: you decide and steer, the agent plans, builds and verifies, and the files remember everything.
      </p>
    </header>

    <section id="the-loop" class="hc-section">
      <h2>The loop</h2>
      <p>Pick a step to see what you say to your agent and what comes back.</p>
      <LoopDiagram :chapter-link="chapterLink" />
    </section>

    <section id="learn" class="hc-section">
      <RouterLink class="course" :to="helpLink('/help/learn', from)">
        <img class="course-poster" :src="poster" alt="" loading="lazy" />
        <div class="course-text">
          <p class="hc-eyebrow">Course · 8 chapters · short videos</p>
          <h2>Working with AI agents</h2>
          <p>
            Why agents need a harness, what skills are, grilling, PRDs, vertical slices, the issue loop and feedback
            loops — the ideas behind the workflow, one chapter at a time.
          </p>
          <span class="course-go">Start learning <ArrowRight :size="14" aria-hidden="true" /></span>
        </div>
      </RouterLink>
    </section>

    <section id="more" class="hc-section">
      <h2>Everything else</h2>
      <div class="cards">
        <RouterLink v-for="m in MORE" :key="m.path" class="card" :to="helpLink(m.path, from)">
          <component :is="m.icon" class="card-icon" :size="17" aria-hidden="true" />
          <strong>{{ m.title }}</strong>
          <span>{{ m.text }}</span>
        </RouterLink>
      </div>
    </section>

    <section id="credits" class="hc-section">
      <div class="credit">
        <p>
          <strong>Built on Matt Pocock’s skills.</strong> grill-me, to-prd, to-issues, tdd and most of the other skills
          loopboard installs are adapted from <a :href="SKILLS_REPO" target="_blank" rel="noopener">mattpocock/skills</a>
          (MIT), along with much of the thinking in the course. loopboard adds local files, a board and the
          <code>implement</code> loop.
        </p>
        <RouterLink :to="helpLink('/help/learn', from, 'sources')">His videos and writing →</RouterLink>
      </div>
    </section>
  </article>
</template>

<style scoped>
.course {
  display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); align-items: center; gap: 28px;
  padding: 14px; border: 1px solid var(--border); border-radius: 14px; background: var(--surface);
  color: inherit; text-decoration: none; box-shadow: var(--shadow-sm);
  transition: border-color var(--dur) var(--ease), box-shadow var(--dur-slow) var(--ease);
}
.course:hover { border-color: var(--border-strong); box-shadow: var(--shadow); }
.course-poster { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 9px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); }
.course-text h2 { margin: 0 0 8px; font-size: 21px; font-weight: 600; letter-spacing: -0.015em; }
.course-text p:not(.hc-eyebrow) { margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: var(--text-2); }
.course-go { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: var(--accent-text); }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
.card {
  display: grid; gap: 6px; padding: 16px; border: 1px solid var(--border); border-radius: var(--r-xl);
  background: var(--surface); color: inherit; text-decoration: none;
  transition: border-color var(--dur) var(--ease), background var(--dur) var(--ease);
}
.card:hover { border-color: var(--border-strong); background: var(--bg-subtle); }
.card-icon { color: var(--accent-text); }
.card strong { font-size: 14px; font-weight: 600; }
.card span { font-size: 13px; line-height: 1.5; color: var(--text-3); }
.credit { display: grid; gap: 8px; padding: 18px 20px; border-radius: var(--r-xl); background: var(--bg-subtle); border: 1px solid var(--border-subtle); }
.credit p { margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--text-2); }
.credit strong { color: var(--text); font-weight: 600; }
.credit a { font-size: 13px; color: var(--accent-text); }
.credit p a { font-size: inherit; }
.credit code { padding: 1px 5px; border-radius: var(--r-sm); background: var(--bg-hover); font-size: 12px; }
@media (max-width: 760px) { .course { grid-template-columns: minmax(0, 1fr); gap: 14px; } }
</style>
