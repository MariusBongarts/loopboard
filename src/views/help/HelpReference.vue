<script setup lang="ts">
import { marked } from 'marked';
import folderMap from '../../../docs/folder-map.md?raw';
import statuses from '../../../docs/statuses.md?raw';
import theLoop from '../../../docs/the-loop.md?raw';
import { SHORTCUTS } from '../../shortcuts';

// Reference (#0060): the same docs the README links to, rendered here.
function render(md: string): string {
  // The page supplies its own section headings.
  return marked.parse(md.replace(/^# .*\n+/, ''), { async: false });
}

const SECTIONS = [
  { id: 'loop', title: 'The loop', html: render(theLoop) },
  { id: 'folders', title: 'What lives where', html: render(folderMap) },
  { id: 'statuses', title: 'Statuses and fields', html: render(statuses) },
];
</script>

<template>
  <article class="hc-page">
    <header>
      <p class="hc-eyebrow">Reference</p>
      <h1>Reference</h1>
      <p class="hc-lede">The loop, the files, the fields and the keys — everything loopboard reads and writes.</p>
    </header>

    <section v-for="s in SECTIONS" :id="s.id" :key="s.id" class="hc-section">
      <h2>{{ s.title }}</h2>
      <div class="prose ref-prose" v-html="s.html" />
    </section>

    <section id="shortcuts" class="hc-section">
      <h2>Keyboard shortcuts</h2>
      <table class="keys">
        <tr v-for="(s, id) in SHORTCUTS" :key="id">
          <td><kbd>{{ s.display }}</kbd></td>
          <td>{{ s.label }}</td>
        </tr>
      </table>
    </section>
  </article>
</template>

<style scoped>
.ref-prose { font-size: 14px; }
.ref-prose :deep(table) { width: 100%; border-collapse: collapse; font-size: 13px; }
.ref-prose :deep(table + table) { margin-top: 22px; }
.ref-prose :deep(th), .ref-prose :deep(td) { padding: 7px 10px 7px 0; border-bottom: 1px solid var(--border-subtle); text-align: left; vertical-align: top; }
.ref-prose :deep(pre) { overflow-x: auto; }
.keys { border-collapse: collapse; font-size: 13.5px; }
.keys td { padding: 6px 16px 6px 0; border-bottom: 1px solid var(--border-subtle); }
.keys kbd { padding: 1px 7px; border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 5px; background: var(--bg); font-family: var(--mono); font-size: 12px; }
</style>
