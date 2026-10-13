<script setup lang="ts">
import CopyPrompt from '../../components/CopyPrompt.vue';
import { SETUP_PROMPT } from '../../help';

// Set up a repo (#0060): the one setup prompt and what it creates.
const PARTS = [
  {
    name: 'AGENTS.md',
    text: 'A managed Workflow block — the session loop and which docs to load when — plus your own rules and build commands. CLAUDE.md imports it.',
  },
  {
    name: '.agents/skills/',
    text: 'grill-me, grill-with-docs, to-prd, to-issues, implement, triage, issue-grooming and upgrade-harness, linked into .claude/skills (and .cursor/skills).',
  },
  {
    name: '.agents/',
    text: 'issues, projects, specs, architecture, rules and design — each with a README that explains its format.',
  },
];

const COMMANDS = [
  { cmd: 'npx loopboard init', does: 'Sets up the workflow. Never overwrites a file.' },
  { cmd: 'npx loopboard init --with-extras', does: 'Adds tdd, diagnose, improve-codebase-architecture and write-a-skill.' },
  { cmd: 'npx loopboard init --kind docs', does: 'Sets up a folder without code: issues and projects, no specs, skills or links, no git needed.' },
  { cmd: 'npx loopboard', does: 'Opens the board for this repo; a running board adds it to the switcher.' },
  { cmd: 'npx loopboard next-id issue', does: 'The next free issue number across every branch and worktree.' },
  { cmd: 'npx loopboard check --branches', does: 'Finds duplicate numbers, dangling references and files the board skips.' },
];
</script>

<template>
  <article class="hc-page">
    <header>
      <p class="hc-eyebrow">Set up a repo</p>
      <h1>Hand the setup to your agent</h1>
      <p class="hc-lede">
        One prompt: your agent runs <code>init</code>, fills in your build and test commands, keeps the instructions
        you already have, and opens the board.
      </p>
    </header>

    <section id="get-started" class="hc-section">
      <h2>Paste this into your agent</h2>
      <p>In the repo, in Claude Code, Cursor, Codex or any agent that can run commands:</p>
      <CopyPrompt :text="SETUP_PROMPT" label="Copy setup prompt" />
      <p class="hc-note">
        Prefer the terminal? Run <code>npx loopboard init</code>, then ask your agent to follow
        <code>.agents/SETUP.md</code>.
      </p>
    </section>

    <section id="what-you-get" class="hc-section">
      <h2>What you get</h2>
      <div class="parts">
        <div v-for="p in PARTS" :key="p.name" class="part">
          <code class="part-name">{{ p.name }}</code>
          <p>{{ p.text }}</p>
        </div>
      </div>
    </section>

    <section id="already-set-up" class="hc-section">
      <h2>Already set up?</h2>
      <p>Run <code>npx loopboard</code> in that repo and it joins the workspace switcher, or add it from the switcher menu.</p>
      <table class="cmds">
        <tr v-for="c in COMMANDS" :key="c.cmd">
          <td><code>{{ c.cmd }}</code></td>
          <td>{{ c.does }}</td>
        </tr>
      </table>
    </section>
  </article>
</template>

<style scoped>
.parts { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
.part { padding: 14px; border: 1px solid var(--border); border-radius: var(--r-xl); background: var(--surface); }
.part-name { font-size: 12.5px; font-weight: 600; color: var(--accent-text); }
.part p { margin: 6px 0 0; font-size: 13px; line-height: 1.55; color: var(--text-2); }
.cmds { width: 100%; margin-top: 4px; border-collapse: collapse; font-size: 13px; }
.cmds td { padding: 8px 14px 8px 0; border-bottom: 1px solid var(--border-subtle); vertical-align: top; color: var(--text-2); }
.cmds td:first-child { white-space: nowrap; color: var(--text); }
@media (max-width: 600px) { .cmds td:first-child { white-space: normal; } }
</style>
