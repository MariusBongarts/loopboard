<script setup lang="ts">
import { Bot, User } from '@lucide/vue';
import type { Assignee } from '../types';

// Assignee avatar (#0046): the agent is a bot, the human is "you".
const props = defineProps<{ assignee: Assignee; size?: number }>();
</script>

<template>
  <span
    class="avatar"
    :class="`avatar-${props.assignee}`"
    :style="{ '--avatar-size': `${props.size ?? 18}px` }"
    role="img"
    :aria-label="props.assignee === 'agent' ? 'Agent' : 'You'"
    :title="props.assignee === 'agent' ? 'Agent' : 'You'"
  >
    <Bot v-if="props.assignee === 'agent'" :size="Math.round((props.size ?? 18) * 0.62)" :stroke-width="2" aria-hidden="true" />
    <User v-else :size="Math.round((props.size ?? 18) * 0.62)" :stroke-width="2" aria-hidden="true" />
  </span>
</template>
