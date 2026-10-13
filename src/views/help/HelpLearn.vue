<script setup lang="ts">
import { ArrowRight, MessageSquare } from '@lucide/vue';
import { marked } from 'marked';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import HelpVideo from '../../components/HelpVideo.vue';
import SourceVideo from '../../components/SourceVideo.vue';
import { CHAPTERS, SKILLS_REPO, SOURCE_READING, SOURCE_VIDEOS } from '../../course';
import { helpLink } from '../../help';

// Working with AI agents (#0066, #0067): the course. Prose comes from
// docs/learn/, videos from videos/ (rendered with Remotion).
const route = useRoute();
const from = computed(() => route.query.from);

function render(md: string): string {
  const html = marked.parse(md, { async: false });
  return html.replace(/<a href="(https?:[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');
}

const chapters = CHAPTERS.map((c) => ({ ...c, html: render(c.markdown) }));
</script>

<template>
  <article class="hc-page">
    <header>
      <p class="hc-eyebrow">Course · {{ chapters.length }} chapters · about 15 minutes</p>
      <h1>Working with AI agents</h1>
      <p class="hc-lede">
        Coding agents are fast, tireless and forgetful. These chapters explain the habits that make them dependable —
        and how loopboard’s files and skills put those habits into every session.
      </p>
      <p class="credit">
        Much of this comes from <strong>Matt Pocock</strong>: the skills are adapted from his
        <a :href="SKILLS_REPO" target="_blank" rel="noopener">mattpocock/skills</a> (MIT), and his videos and writing
        are the best way to go deeper — see <RouterLink :to="helpLink('/help/learn', from, 'sources')">Learn from the source</RouterLink>.
      </p>
    </header>

    <nav class="toc" aria-label="Chapters">
      <RouterLink v-for="c in chapters" :key="c.id" class="toc-item" :to="helpLink('/help/learn', from, c.id)">
        <span class="toc-n">{{ c.number }}</span>
        <span>{{ c.title }}</span>
      </RouterLink>
    </nav>

    <section v-for="c in chapters" :id="c.id" :key="c.id" class="hc-section chapter">
      <p class="hc-eyebrow">Chapter {{ c.number }}</p>
      <h2>{{ c.title }}</h2>
      <HelpVideo v-if="c.video" :name="c.video" :label="c.videoLabel ?? c.title" class="chapter-video" />
      <p v-if="c.say" class="say">
        <MessageSquare :size="14" aria-hidden="true" />
        <span>You say <strong>“{{ c.say }}”</strong></span>
        <span class="say-skill">→ <code>{{ c.skill }}</code></span>
      </p>
      <div class="prose chapter-prose" v-html="c.html" />
    </section>

    <section id="sources" class="hc-section">
      <p class="hc-eyebrow">Credits</p>
      <h2>Learn from the source</h2>
      <p>
        Matt Pocock teaches TypeScript and AI engineering (Total TypeScript, AI Hero). His skills repo —
        <a :href="SKILLS_REPO" target="_blank" rel="noopener">mattpocock/skills</a> — is where grill-me, the
        PRD and issue skills, tdd and the rest started; loopboard adapts them to local files and a board. Thank you,
        Matt.
      </p>
      <div class="videos">
        <SourceVideo v-for="v in SOURCE_VIDEOS" :key="v.id" v-bind="v" />
      </div>
      <h3 class="reading-title">Reading</h3>
      <ul class="reading">
        <li v-for="r in SOURCE_READING" :key="r.url">
          <a :href="r.url" target="_blank" rel="noopener">{{ r.title }}</a>
          <span>{{ r.about }}</span>
        </li>
      </ul>
      <p class="hc-note">Videos and articles are Matt Pocock’s and load from his sites only when you open them.</p>
    </section>

    <section id="try" class="hc-section">
      <RouterLink class="next" :to="helpLink('/help/setup', from)">
        <span>
          <strong>Try it in a repo</strong>
          <span>One prompt sets up the skills and files — then say “grill me on …”.</span>
        </span>
        <ArrowRight :size="16" aria-hidden="true" />
      </RouterLink>
    </section>
  </article>
</template>

<style scoped>
.credit { margin: 18px 0 0; padding: 12px 14px; border-left: 2px solid var(--accent); border-radius: 0 var(--r-lg) var(--r-lg) 0; background: var(--bg-subtle); font-size: 13.5px; line-height: 1.6; color: var(--text-2); }
.credit strong { color: var(--text); font-weight: 600; }
.credit a { color: var(--accent-text); }
.toc { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 6px; margin-top: 28px; }
.toc-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 1px solid var(--border-subtle); border-radius: var(--r-lg);
  font-size: 13px; color: var(--text-2); text-decoration: none; transition: border-color var(--dur) var(--ease), color var(--dur) var(--ease);
}
.toc-item:hover { border-color: var(--border-strong); color: var(--text); }
.toc-n { display: grid; place-items: center; flex: none; width: 20px; height: 20px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-text); font-size: 11px; font-weight: 600; }
.chapter { border-top: 1px solid var(--border-subtle); margin-top: 44px; }
.chapter > .hc-eyebrow { margin-bottom: 4px; }
.chapter > h2 { margin-bottom: 16px; font-size: 22px; letter-spacing: -0.016em; }
.chapter-video { margin-bottom: 18px; }
.say { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 14px; padding: 8px 12px; border-radius: var(--r-lg); background: var(--accent-soft); font-size: 13px; color: var(--text-2); }
.say svg { color: var(--accent-text); }
.say strong { color: var(--text); font-weight: 600; }
.say-skill code { font-size: 12px; color: var(--accent-text); }
.chapter-prose { font-size: 14.5px; }
.chapter-prose :deep(table) { width: 100%; margin: 12px 0; border-collapse: collapse; font-size: 13px; }
.chapter-prose :deep(th), .chapter-prose :deep(td) { padding: 7px 10px 7px 0; border-bottom: 1px solid var(--border-subtle); text-align: left; vertical-align: top; }
.chapter-prose :deep(a) { color: var(--accent-text); }
.videos { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 22px 16px; margin: 18px 0 8px; }
.reading-title { margin: 28px 0 8px; font-size: 15px; font-weight: 600; }
.reading { list-style: none; margin: 0 0 12px; padding: 0; }
.reading li { display: flex; flex-wrap: wrap; gap: 4px 10px; padding: 8px 0; border-bottom: 1px solid var(--border-subtle); font-size: 13.5px; }
.reading a { color: var(--accent-text); font-weight: 500; }
.reading span { color: var(--text-3); }
.next {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px;
  border: 1px solid var(--border); border-radius: var(--r-xl); background: var(--surface); color: var(--text); text-decoration: none;
  transition: border-color var(--dur) var(--ease);
}
.next:hover { border-color: var(--accent); }
.next > span { display: grid; gap: 3px; }
.next strong { font-size: 15px; font-weight: 600; }
.next span span { font-size: 13px; color: var(--text-3); }
.next svg { color: var(--accent-text); flex: none; }
</style>
