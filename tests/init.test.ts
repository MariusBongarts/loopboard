import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cp, lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { applyPlan, latestMigration, planInit, refreshBlock, renderBlock, type Action } from '../server/init';

const PKG = resolve(__dirname, '..');
let repo: string;

beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), 'loopboard-init-'));
});

afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

async function init(opts: Partial<Parameters<typeof planInit>[0]> = {}, pkg = PKG): Promise<Action[]> {
  const actions = await planInit({ repoPath: repo, packageRoot: pkg, ...opts });
  await applyPlan(repo, actions, '0.0.0-test');
  return actions;
}

const read = (path: string) => readFile(join(repo, path), 'utf8');
const paths = (actions: Action[], kind: Action['kind']) => actions.filter((a) => a.kind === kind).map((a) => a.path);

describe('loopboard init', () => {
  it('scaffolds an empty repo', async () => {
    const actions = await init();
    const created = paths(actions, 'create');

    expect(created).toContain('.agents/skills/implement/SKILL.md');
    expect(created).toContain('.agents/skills/upgrade-harness/SKILL.md');
    expect(created).toContain('.agents/skills/CREDITS.md');
    expect(created).not.toContain('.agents/skills/tdd/SKILL.md');
    expect(created).toEqual(expect.arrayContaining([
      '.agents/issues/README.md',
      '.agents/issues/_templates/bug.md',
      '.agents/projects/_templates/prd.md',
      '.agents/specs/_specs.md',
      '.agents/architecture/_architecture.md',
      '.agents/rules/README.md',
      '.agents/design/README.md',
      '.agents/SETUP.md',
      'CLAUDE.md',
      'AGENTS.md',
    ]));
    const agents = await read('AGENTS.md');
    expect(agents).toContain(`<!-- loopboard:migration ${latestMigration(PKG)} -->`);
    expect(agents).toContain('## Build & test');
    expect(await read('CLAUDE.md')).toBe('@AGENTS.md\n');
    expect((await lstat(join(repo, '.claude/skills/implement'))).isSymbolicLink()).toBe(true);
    expect(await read('.claude/skills/implement/SKILL.md')).toContain('# Implement');
    await expect(lstat(join(repo, '.cursor'))).rejects.toThrow();
  });

  it('creates nothing on a second run', async () => {
    await init();
    const again = await planInit({ repoPath: repo, packageRoot: PKG });
    expect(again.filter((a) => !['same', 'keep'].includes(a.kind))).toEqual([]);
  });

  it('appends the block to an existing AGENTS.md and keeps CLAUDE.md', async () => {
    await writeFile(join(repo, 'AGENTS.md'), '# Agents\n\nUse tabs.\n');
    await writeFile(join(repo, 'CLAUDE.md'), 'Be brief.\n');
    await init();
    const agents = await read('AGENTS.md');
    expect(agents.startsWith('# Agents\n\nUse tabs.\n\n<!-- loopboard:start')).toBe(true);
    expect(await read('CLAUDE.md')).toBe('Be brief.\n');
  });

  it('adds extras on request and links Cursor when the repo uses it', async () => {
    await mkdir(join(repo, '.cursor'));
    await init({ withExtras: true });
    expect(await read('.agents/skills/tdd/SKILL.md')).toContain('# Test-Driven Development');
    expect((await lstat(join(repo, '.cursor/skills/tdd'))).isSymbolicLink()).toBe(true);
  });

  it('sends a legacy ai/ harness to upgrade-harness', async () => {
    await mkdir(join(repo, 'ai', 'issues'), { recursive: true });
    await expect(planInit({ repoPath: repo, packageRoot: PKG })).rejects.toThrow(/upgrade my loopboard harness/);
  });
});

describe('loopboard init --upgrade', () => {
  async function fakePackage(): Promise<string> {
    const pkg = join(repo, '..', `${repo.split('/').pop()}-pkg`);
    for (const p of ['.agents/skills', '.agents/issues/README.md', '.agents/issues/_templates', '.agents/projects/README.md', '.agents/projects/_templates', 'scaffold', 'MIGRATIONS.md']) {
      await cp(join(PKG, p), join(pkg, p), { recursive: true });
    }
    return pkg;
  }

  it('updates untouched shipped files, keeps edited ones, never bumps the migration level', async () => {
    await init();
    const pkg = await fakePackage();
    try {
      await writeFile(join(pkg, '.agents/skills/triage/SKILL.md'), '# Triage v2\n');
      await writeFile(join(pkg, '.agents/skills/implement/SKILL.md'), '# Implement v2\n');
      await writeFile(join(repo, '.agents/skills/implement/SKILL.md'), '# My implement\n');
      await writeFile(join(repo, '.agents/specs/_specs.md'), '# Mine\n');

      const actions = await init({ upgrade: true }, pkg);

      expect(paths(actions, 'update')).toEqual(['.agents/skills/triage/SKILL.md']);
      expect(paths(actions, 'keep-modified')).toEqual(['.agents/skills/implement/SKILL.md']);
      expect(await read('.agents/skills/triage/SKILL.md')).toBe('# Triage v2\n');
      expect(await read('.agents/skills/implement/SKILL.md')).toBe('# My implement\n');
      expect(await read('.agents/specs/_specs.md')).toBe('# Mine\n');
      expect(await read('AGENTS.md')).toContain(`<!-- loopboard:migration ${latestMigration(PKG)} -->`);

      const forced = await init({ upgrade: true, force: true }, pkg);
      expect(paths(forced, 'update')).toEqual(['.agents/skills/implement/SKILL.md']);
    } finally {
      await rm(pkg, { recursive: true, force: true });
    }
  });

  it('refreshes the block text but keeps the harness level', () => {
    const agents = '# A\n\n<!-- loopboard:start -->\n<!-- loopboard:migration M001 -->\nold\n<!-- loopboard:end -->\n\nTail\n';
    const next = refreshBlock(agents, renderBlock(PKG, 'M009'));
    expect(next).toContain('<!-- loopboard:migration M001 -->');
    expect(next).toContain('## Workflow');
    expect(next.endsWith('\n\nTail\n')).toBe(true);
  });
});

describe('this repo', () => {
  it('embeds the same managed block that init ships', async () => {
    const agents = await readFile(join(PKG, 'AGENTS.md'), 'utf8');
    expect(agents).toContain(renderBlock(PKG, latestMigration(PKG)).trimEnd());
  });
});

describe('docs', () => {
  it('the README embeds the setup prompt from docs/setup-prompt.md', async () => {
    const prompt = (await readFile(join(PKG, 'docs/setup-prompt.md'), 'utf8')).trimEnd();
    expect(await readFile(join(PKG, 'README.md'), 'utf8')).toContain(prompt);
  });
});
