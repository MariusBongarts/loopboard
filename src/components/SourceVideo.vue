<script setup lang="ts">
import { ExternalLink, Play } from '@lucide/vue';
import { ref } from 'vue';

// One of Matt Pocock's videos (#0067). Nothing loads from YouTube until the
// card is clicked; then the privacy-enhanced embed takes its place.
const props = defineProps<{ id: string; title: string; length: string; about: string }>();
const playing = ref(false);
</script>

<template>
  <article class="source-video">
    <div class="sv-frame">
      <iframe
        v-if="playing"
        :src="`https://www.youtube-nocookie.com/embed/${props.id}?autoplay=1&rel=0`"
        :title="props.title"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
      />
      <button v-else type="button" class="sv-play" :aria-label="`Play “${props.title}” (loads from YouTube)`" @click="playing = true">
        <span class="sv-icon"><Play :size="18" aria-hidden="true" /></span>
        <span class="sv-meta">Matt Pocock · {{ props.length }}</span>
        <span class="sv-load">Loads from YouTube</span>
      </button>
    </div>
    <h3>{{ props.title }}</h3>
    <p>{{ props.about }}</p>
    <a class="sv-out" :href="`https://www.youtube.com/watch?v=${props.id}`" target="_blank" rel="noopener">
      Open on YouTube <ExternalLink :size="12" aria-hidden="true" />
    </a>
  </article>
</template>

<style scoped>
.source-video { display: grid; align-content: start; gap: 6px; }
.sv-frame { position: relative; aspect-ratio: 16 / 9; margin-bottom: 4px; overflow: hidden; border: 1px solid var(--border); border-radius: var(--r-xl); background: var(--bg-subtle); }
.sv-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.sv-play {
  position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 8px;
  border: 0; border-radius: 0; background:
    radial-gradient(120% 90% at 20% 0%, color-mix(in oklch, var(--accent) 18%, transparent), transparent 60%),
    radial-gradient(90% 80% at 100% 100%, color-mix(in oklch, var(--red) 14%, transparent), transparent 60%),
    var(--bg-subtle);
  color: var(--text-2);
}
.sv-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 999px; background: var(--surface); color: var(--text); box-shadow: var(--shadow); transition: scale var(--dur) var(--ease); }
.sv-play:hover .sv-icon { scale: 1.06; }
.sv-meta { font-size: 12.5px; font-weight: 500; }
.sv-load { font-size: 11.5px; color: var(--text-3); }
.source-video h3 { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.4; }
.source-video p { margin: 0; font-size: 13px; line-height: 1.5; color: var(--text-3); }
.sv-out { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; color: var(--accent-text); text-decoration: none; }
.sv-out:hover { text-decoration: underline; }
</style>
