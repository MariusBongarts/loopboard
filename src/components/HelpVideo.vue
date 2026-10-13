<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { videoSources, type VideoName } from '../course';
import { resolvedTheme } from '../theme';

// An explainer video in the course (#0066): follows the theme, plays muted
// and looped only while mostly on screen, never autoplays with reduced motion.
const props = defineProps<{ name: VideoName; label: string }>();
const video = ref<HTMLVideoElement | null>(null);
const sources = computed(() => videoSources(props.name, resolvedTheme.value));
let visible = false;
let observer: IntersectionObserver | null = null;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function sync() {
  const el = video.value;
  if (!el) return;
  if (visible && !reducedMotion.matches) el.play().catch(() => undefined);
  else el.pause();
}

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !video.value) return;
  observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      sync();
    },
    { threshold: 0.5 },
  );
  observer.observe(video.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <figure class="help-video">
    <video
      ref="video"
      :src="sources.src"
      :poster="sources.poster"
      :aria-label="props.label"
      :data-video="props.name"
      muted
      loop
      playsinline
      controls
      preload="metadata"
      disablepictureinpicture
      @loadeddata="sync"
    />
  </figure>
</template>

<style scoped>
.help-video { margin: 0; }
.help-video video { display: block; width: 100%; aspect-ratio: 16 / 9; border: 1px solid var(--border); border-radius: var(--r-xl); background: var(--bg-subtle); box-shadow: var(--shadow-sm); }
</style>
