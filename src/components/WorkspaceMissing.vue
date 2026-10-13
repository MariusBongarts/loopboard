<script setup lang="ts">
import { useRouter } from 'vue-router';
import { removeWorkspace } from '../api';
import type { WorkspaceSummary } from '../types';
import { SETUP_PROMPT } from '../help';
import CopyPrompt from './CopyPrompt.vue';
import WorkspaceSwitcher from './WorkspaceSwitcher.vue';

// A registered workspace whose root is gone (#0015). WorkspaceView keeps
// checking, so this turns into the board as soon as the folder is back.
const props = defineProps<{ workspace: WorkspaceSummary }>();
const router = useRouter();

async function forget() {
  await removeWorkspace(props.workspace.id);
  router.push('/');
}
</script>

<template>
  <main class="welcome">
    <div class="welcome-card">
      <div class="welcome-switch"><WorkspaceSwitcher :current="props.workspace" /></div>
      <p class="eyebrow">Workspace unavailable</p>
      <h1>{{ props.workspace.name }} has no workflow folder</h1>
      <p>
        loopboard can't find <code>{{ props.workspace.root }}</code>. The repo may have moved, or the
        folder was deleted. This page turns into the board as soon as it's back.
      </p>
      <h2>The repo moved</h2>
      <p>Forget it here, then run <code>npx loopboard</code> in its new location (or add it from the menu).</p>
      <p><button type="button" @click="forget">Forget this workspace</button></p>
      <h2>Set it up again</h2>
      <p>Run <code>npx loopboard init</code> in <code>{{ props.workspace.repoPath }}</code>, or paste this into your agent there:</p>
      <CopyPrompt :text="SETUP_PROMPT" label="Copy setup prompt" />
    </div>
  </main>
</template>
