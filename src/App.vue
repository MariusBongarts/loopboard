<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import Toasts from './components/Toasts.vue';
import { hasModifier, isShortcut, isTyping } from './shortcuts';

const router = useRouter();
const route = useRoute();

// `?` opens Help from anywhere and remembers where to come back to.
function onKeydown(e: KeyboardEvent) {
  if (isTyping(e) || hasModifier(e) || !isShortcut(e, 'help')) return;
  if (route.path === '/help' || document.querySelector('.modal-backdrop')) return;
  e.preventDefault();
  const ws = typeof route.params.ws === 'string' ? route.params.ws : undefined;
  router.push({ path: '/help', query: ws ? { from: ws } : {} });
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <RouterView />
  <Toasts />
</template>
