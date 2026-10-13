<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { fetchHarness } from '../../api';
import CopyPrompt from '../../components/CopyPrompt.vue';
import { UPGRADE_REQUEST, upgradePrompt } from '../../help';
import type { HarnessInfo, WorkspaceHarness } from '../../types';

// Upgrade a harness (#0061, #0062): which repos are behind, and the prompts
// that bring them up to date.
const MIGRATIONS_URL = 'https://github.com/MariusBongarts/loopboard/blob/main/MIGRATIONS.md';
const info = ref<HarnessInfo | null>(null);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    info.value = await fetchHarness();
  } catch (e) {
    error.value = (e as Error).message;
  }
});

const fullPrompt = computed(() => upgradePrompt(info.value?.packagePath));
const behindCount = computed(() => info.value?.workspaces.filter((w) => w.status !== 'current').length ?? 0);

function statusLabel(w: WorkspaceHarness): string {
  switch (w.status) {
    case 'current':
      return 'Up to date';
    case 'behind':
      return `${w.behind} behind`;
    case 'unmarked':
      return 'No marker';
    case 'no-agents-md':
      return 'No AGENTS.md';
    case 'missing':
      return 'Folder missing';
  }
}

const TONE: Record<WorkspaceHarness['status'], string> = {
  current: 'ok',
  behind: 'warn',
  unmarked: 'warn',
  'no-agents-md': 'muted',
  missing: 'bad',
};

const CLI = [
  { cmd: 'npx loopboard init --upgrade', does: 'Replaces the skills, READMEs and templates you never edited, adds new ones, and lists the files you edited as skipped.' },
  { cmd: '… --dry-run', does: 'Prints the same report without writing anything.' },
  { cmd: '… --force', does: 'Overwrites the files you edited, too.' },
];
</script>

<template>
  <article class="hc-page">
    <header>
      <p class="hc-eyebrow">Upgrade a harness</p>
      <h1>Keep your repos on the latest workflow</h1>
      <p class="hc-lede">
        Workflow changes ship as numbered migrations. Your agent merges them into each repo’s harness — the
        AGENTS.md block, skills and conventions — without losing what you customized.
      </p>
    </header>

    <section id="your-repos" class="hc-section">
      <h2>Your repos</h2>
      <p v-if="error" class="banner-error">{{ error }}</p>
      <p v-else-if="!info" class="hc-note">Checking your repos…</p>
      <template v-else>
        <p>
          The latest migration is <code>{{ info.latest }}</code> (loopboard <span class="version">{{ info.version }}</span>).
          {{ behindCount ? `${behindCount} of ${info.workspaces.length} repos need a look.` : 'Every repo is up to date.' }}
        </p>
        <table class="repos" aria-label="Harness level per repo">
          <thead>
            <tr><th>Repo</th><th>Harness</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr v-for="w in info.workspaces" :key="w.id" :data-workspace="w.id">
              <td>
                <span class="repo-name">{{ w.name }}</span>
                <span class="repo-path">{{ w.repoPath }}</span>
              </td>
              <td><code>{{ w.level ?? '—' }}</code></td>
              <td>
                <span class="pill" :class="TONE[w.status]">{{ statusLabel(w) }}</span>
                <span v-if="w.legacy" class="pill muted" title="Issues live in ai/ instead of .agents/">ai/ root</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="hc-note">
          The level is the <code class="marker">&lt;!-- loopboard:migration MNNN --&gt;</code> marker in each repo’s AGENTS.md; a
          harness without one predates migrations (M000).
        </p>
      </template>
    </section>

    <section id="ask" class="hc-section">
      <h2>Ask your agent</h2>
      <p>In a repo that has the <code>upgrade-harness</code> skill, this is all it takes:</p>
      <CopyPrompt :text="UPGRADE_REQUEST" label="Copy request" />
      <p class="hc-note">
        The agent reports first — skill by skill, migration by migration — and asks before any step marked
        Confirm first, like moving an <code>ai/</code> root or changing issue statuses in bulk.
      </p>
    </section>

    <section id="no-skill" class="hc-section">
      <h2>A repo without the skill</h2>
      <p>Older harnesses may not have <code>upgrade-harness</code> yet. Point the agent at the loopboard you’re running:</p>
      <CopyPrompt :text="fullPrompt" label="Copy upgrade prompt" />
      <p class="hc-note">The path is where this loopboard runs from right now, so the agent reads the same version you see.</p>
    </section>

    <section id="cli" class="hc-section">
      <h2>What the CLI does, and what it doesn’t</h2>
      <table class="cli">
        <tr v-for="c in CLI" :key="c.cmd">
          <td><code>{{ c.cmd }}</code></td>
          <td>{{ c.does }}</td>
        </tr>
      </table>
      <p>
        The CLI never merges and never touches issues, projects, specs or architecture. Merging your edits and
        applying migrations is the skill’s job — so run <code>init --upgrade</code> first, then ask your agent.
      </p>
    </section>

    <section id="migrations" class="hc-section">
      <h2>Migrations</h2>
      <p v-if="!info" class="hc-note">Loading…</p>
      <ol v-else class="migrations">
        <li v-for="m in [...info.migrations].reverse()" :key="m.id">
          <code>{{ m.id }}</code>
          <span>{{ m.title.replace(/`/g, '') }}</span>
          <time v-if="m.date" :datetime="m.date">{{ m.date }}</time>
        </li>
      </ol>
      <p class="hc-note">
        What each one changes and how it’s applied: <a :href="MIGRATIONS_URL" target="_blank" rel="noopener">MIGRATIONS.md</a>.
      </p>
    </section>
  </article>
</template>

<style scoped>
.repos, .cli { width: 100%; border-collapse: collapse; font-size: 13px; }
.repos th { padding: 0 12px 8px 0; border-bottom: 1px solid var(--border); text-align: left; font-size: 12px; font-weight: 500; color: var(--text-3); }
.repos td, .cli td { padding: 9px 12px 9px 0; border-bottom: 1px solid var(--border-subtle); vertical-align: top; color: var(--text-2); }
.repos td:last-child { white-space: nowrap; }
.repo-name { display: block; font-weight: 500; color: var(--text); }
.repo-path { display: block; margin-top: 2px; font-family: var(--mono); font-size: 11.5px; color: var(--text-3); overflow-wrap: anywhere; }
.cli td:first-child { white-space: nowrap; color: var(--text); }
.pill { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; margin-right: 4px; border-radius: 999px; font-size: 12px; font-weight: 500; }
.pill.ok { background: var(--green-soft); color: var(--green-text); }
.pill.warn { background: var(--amber-soft); color: var(--amber-text); }
.pill.bad { background: var(--red-soft); color: var(--red-text); }
.pill.muted { background: var(--bg-hover); color: var(--text-2); }
.marker { font-variant-ligatures: none; }
.migrations { list-style: none; margin: 0 0 10px; padding: 0; display: grid; gap: 1px; }
.migrations li { display: grid; grid-template-columns: 52px minmax(0, 1fr) auto; gap: 12px; align-items: baseline; padding: 9px 0; border-bottom: 1px solid var(--border-subtle); font-size: 13.5px; }
.migrations code { font-size: 12px; color: var(--accent-text); }
.migrations time { font-size: 12px; color: var(--text-3); }
@media (max-width: 600px) { .cli td:first-child { white-space: normal; } }
</style>
