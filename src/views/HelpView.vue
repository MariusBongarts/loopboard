<script setup lang="ts">
import Wordmark from '../components/Wordmark.vue';
import { marked } from 'marked';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import folderMap from '../../docs/folder-map.md?raw';
import statuses from '../../docs/statuses.md?raw';
import theLoop from '../../docs/the-loop.md?raw';
import SetupPrompt from '../components/SetupPrompt.vue';
import { SHORTCUTS } from '../shortcuts';

// Renders the same docs the README links to (#0014): one source.
const route = useRoute();
const back = computed(() => (typeof route.query.from === 'string' ? `/w/${route.query.from}` : '/'));

const sections = [
  { id: 'loop', title: 'The loop', html: render(theLoop) },
  { id: 'folders', title: 'What lives where', html: render(folderMap) },
  { id: 'statuses', title: 'Statuses and fields', html: render(statuses) },
];

function render(md: string): string {
  // The page supplies its own section headings.
  return marked.parse(md.replace(/^# .*\n+/, ''), { async: false });
}
</script>

<template>
  <main class="help">
    <header class="help-head">
      <div class="help-top"><RouterLink class="help-back" :to="back">← Back to the board</RouterLink><Wordmark /></div>
      <h1>Help</h1>
      <nav class="help-toc" aria-label="Help sections">
        <a href="#get-started">Get started</a>
        <a v-for="s in sections" :key="s.id" :href="`#${s.id}`">{{ s.title }}</a>
        <a href="#shortcuts">Keyboard shortcuts</a>
      </nav>
    </header>

    <section id="get-started" class="help-section">
      <h2>Get started in another repo</h2>
      <p>Paste this into your agent (Claude Code, Cursor, Codex, …) in the repo:</p>
      <SetupPrompt />
      <p class="help-note">
        Already set up? Run <code>npx loopboard</code> in that repo and it joins the workspace switcher.
      </p>
    </section>

    <section v-for="s in sections" :id="s.id" :key="s.id" class="help-section">
      <h2>{{ s.title }}</h2>
      <div class="drawer-body help-prose" v-html="s.html" />
    </section>

    <section id="shortcuts" class="help-section">
      <h2>Keyboard shortcuts</h2>
      <table class="help-keys">
        <tr v-for="(s, id) in SHORTCUTS" :key="id">
          <td><kbd>{{ s.display }}</kbd></td>
          <td>{{ s.label }}</td>
        </tr>
      </table>
    </section>
  </main>
</template>
