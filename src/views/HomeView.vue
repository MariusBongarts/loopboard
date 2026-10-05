<script setup lang="ts">
import Wordmark from '../components/Wordmark.vue';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { fetchWorkspaces } from '../api';
import AddWorkspaceDialog from '../components/AddWorkspaceDialog.vue';
import SetupPrompt from '../components/SetupPrompt.vue';
import type { WorkspaceSummary } from '../types';

// `/` lands on the last-used workspace; with none registered it welcomes
// the user instead (#0015).
const router = useRouter();
const empty = ref(false);
const adding = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const { workspaces, lastUsed } = await fetchWorkspaces();
    const target = workspaces.find((w) => w.id === lastUsed) ?? workspaces[0];
    if (target) router.replace(`/w/${target.id}`);
    else empty.value = true;
  } catch (e) {
    error.value = (e as Error).message;
  }
});

function onAdded(w: WorkspaceSummary) {
  adding.value = false;
  router.push(`/w/${w.id}`);
}
</script>

<template>
  <main class="welcome">
    <p v-if="error" class="banner-error">{{ error }}</p>
    <div v-else-if="empty" class="welcome-card">
      <p class="welcome-brand"><Wordmark /></p>
      <h1>Welcome</h1>
      <p>
        loopboard shows the issues, PRDs and specs you and your coding agents keep in a repo's
        <code>.agents/</code> folder — live, on one board for all your repos.
      </p>
      <h2>A repo that's already set up</h2>
      <p>
        Run <code>npx loopboard</code> in it, or
        <button type="button" class="link-button" @click="adding = true">add it here</button>.
      </p>
      <h2>A new repo</h2>
      <p>Paste this into your agent (Claude Code, Cursor, Codex, …) in that repo:</p>
      <SetupPrompt />
      <p class="welcome-foot"><RouterLink to="/help">How the workflow works →</RouterLink></p>
    </div>
    <AddWorkspaceDialog :open="adding" @close="adding = false" @added="onAdded" />
  </main>
</template>
