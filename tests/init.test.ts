import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { chmod, cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { parseFrontmatter } from '../server/frontmatter';
import { ID_RULE, idProblem, readIdentity, RESERVED_IDS } from '../server/identity';
import { applyPlan, planInit, refreshBlock, renderBlock, type Action } from '../server/init';
import { latestMigration } from '../server/migrations';
import { registerWorkspace } from '../server/workspaces';

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

// A copy of what the package ships, so a test can change it.
async function fakePackage(): Promise<string> {
  const pkg = join(repo, '..', `${basename(repo)}-pkg`);
  for (const p of ['.agents/skills', '.agents/issues/README.md', '.agents/issues/_templates', '.agents/projects/README.md', '.agents/projects/_templates', 'scaffold', 'MIGRATIONS.md']) {
    await cp(join(PKG, p), join(pkg, p), { recursive: true });
  }
  return pkg;
}

// Every file below `dir`, relative to it; symlinks are listed, not followed.
async function tree(dir: string, base = dir): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await tree(full, base)));
    else out.push(relative(base, full).split('\\').join('/'));
  }
  return out.sort();
}

describe('loopboard init', () => {
  it('scaffolds an empty repo', async () => {
    const actions = await init();
    const created = paths(actions, 'create');

    expect(created).toContain('.agents/skills/implement/SKILL.md');
    expect(created).toContain('.agents/skills/upgrade-harness/SKILL.md');
    expect(created).toContain('.agents/skills/issue-grooming/SKILL.md');
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
    expect(JSON.parse(await read('.agents/.loopboard/manifest.json')).scaffold).toBe('code');
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

  // #0078: with nothing to upgrade, --upgrade is a first run.
  it('sets up an empty folder at the latest level, and a hand-made harness at none', async () => {
    const actions = await init({ upgrade: true });
    expect(await read('AGENTS.md')).toContain(`<!-- loopboard:migration ${latestMigration(PKG)} -->`);
    expect(paths(actions, 'create')).toContain('.agents/SETUP.md');

    await rm(repo, { recursive: true, force: true });
    await mkdir(join(repo, '.agents', 'issues'), { recursive: true });
    await init({ upgrade: true });
    expect(await read('AGENTS.md')).toContain('<!-- loopboard:migration M000 -->');
  });

  it('refreshes the block text but keeps the harness level', () => {
    const agents = '# A\n\n<!-- loopboard:start -->\n<!-- loopboard:migration M001 -->\nold\n<!-- loopboard:end -->\n\nTail\n';
    const next = refreshBlock(agents, renderBlock(PKG, 'M009'));
    expect(next).toContain('<!-- loopboard:migration M001 -->');
    expect(next).toContain('## Workflow');
    expect(next.endsWith('\n\nTail\n')).toBe(true);
  });
});

// A harness without code (#0078). The temp folder is not a git repository.
describe('loopboard init --kind docs', () => {
  const DOCS_FILES = [
    '.agents/.loopboard/manifest.json',
    '.agents/harness.md',
    '.agents/issues/README.md',
    '.agents/issues/_archive/.gitkeep',
    '.agents/issues/_templates/bug.md',
    '.agents/issues/_templates/task.md',
    '.agents/issues/_templates/user-story.md',
    '.agents/projects/README.md',
    '.agents/projects/_templates/prd.md',
    '.agents/projects/_templates/wip.md',
    'AGENTS.md',
    'CLAUDE.md',
  ];
  const NAMES = ['2026', '2026-10-13', 'true', 'Yes', 'off', '- list', '? key', ' padded ', 'Büro Unterlagen', 'line\nbreak', '"quoted" \\ slash', "it's"];
  // Not as root, and not where a mode bit doesn't lock a file.
  const locks = process.platform !== 'win32' && process.getuid?.() !== 0;
  let base: string;
  let config: string;

  // `repo` becomes a folder inside the temp dir: its name is what gets slugged.
  async function folder(name: string): Promise<string> {
    repo = join(base, name);
    await mkdir(repo, { recursive: true });
    return repo;
  }

  beforeEach(async () => {
    base = await realpath(repo);
    config = join(base, 'config');
    await folder('paperwork');
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  const docs = (opts: Partial<Parameters<typeof planInit>[0]> = {}, pkg = PKG) =>
    init({ kind: 'docs', configDir: config, today: '2026-10-13', ...opts }, pkg);

  it('creates exactly the docs scaffold: no specs, skills, links or SETUP.md', async () => {
    await mkdir(join(repo, '.cursor'));
    const actions = await docs();

    expect(await tree(repo)).toEqual(DOCS_FILES);
    expect(paths(actions, 'create').sort()).toEqual(DOCS_FILES.slice(1));
    expect(paths(actions, 'link')).toEqual([]);
    for (const file of DOCS_FILES) expect((await lstat(join(repo, file))).isSymbolicLink(), file).toBe(false);
    for (const absent of ['.git', '.claude', '.cursor/skills', '.agents/skills', '.agents/specs', '.agents/architecture', '.agents/rules', '.agents/design', '.agents/SETUP.md']) {
      expect(existsSync(join(repo, absent)), absent).toBe(false);
    }
    expect(await read('CLAUDE.md')).toBe('@AGENTS.md\n');
    const manifest = JSON.parse(await read('.agents/.loopboard/manifest.json'));
    expect(manifest.scaffold).toBe('docs');
    expect(Object.keys(manifest.files).sort()).toEqual(DOCS_FILES.filter((f) => /README|_templates/.test(f)));
  });

  it('writes the identity file with the folder\'s slug and name', async () => {
    await docs();

    expect(await read('.agents/harness.md')).toBe(
      [
        '---',
        'schema: 1',
        'id: paperwork',
        'name: paperwork',
        'kind: harness',
        'type: docs',
        'parent: null',
        'created: 2026-10-13',
        '---',
        '',
        '<!-- One paragraph: what this folder is for. People and agents read it first. -->',
        '',
      ].join('\n'),
    );
  });

  it('takes --id, --name and --parent', async () => {
    await docs({ id: 'tax', name: 'Taxes: 2026 #1', parent: 'private' });

    const { data } = parseFrontmatter(await read('.agents/harness.md'));
    expect(data).toMatchObject({ schema: 1, id: 'tax', name: 'Taxes: 2026 #1', kind: 'harness', type: 'docs', parent: 'private' });
    expect(await read('.agents/harness.md')).toContain('\nname: "Taxes: 2026 #1"\n');
  });

  // No `:` in a Windows file name.
  it.skipIf(process.platform === 'win32')('writes a folder name with : and # as a YAML-safe name', async () => {
    await folder('Taxes: 2026 #1');
    await docs();

    const { data } = parseFrontmatter(await read('.agents/harness.md'));
    expect(data).toMatchObject({ id: 'taxes-2026-1', name: 'Taxes: 2026 #1' });
  });

  it('keeps any name readable as the text it is', async () => {
    for (const [i, name] of NAMES.entries()) {
      await folder(`folder-${i}`);
      await docs({ name });
      expect(parseFrontmatter(await read('.agents/harness.md')).data.name, name).toBe(name);
    }
    // Quoted only where YAML needs it.
    expect(await readFile(join(base, `folder-${NAMES.indexOf('Büro Unterlagen')}`, '.agents/harness.md'), 'utf8')).toContain('\nname: Büro Unterlagen\n');
  });

  // The reader takes back what the writer wrote: a ` #` inside quotes is text.
  it('reads every name back, and takes the same --name on a second run', async () => {
    for (const [i, name] of [...NAMES, 'Taxes #2026', 'Taxes: 2026 #1', 'x: y #z', 'a #b', "it's #1"].entries()) {
      await folder(`again-${i}`);
      await docs({ name });
      expect(readIdentity(repo)?.name, name).toBe(name);
      const again = await planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs', name });
      expect(again.filter((a) => !['same', 'keep'].includes(a.kind)), name).toEqual([]);
    }
  });

  it('works in a folder whose name has spaces and umlauts', async () => {
    await folder('Büro Unterlagen');
    await docs();

    const { data } = parseFrontmatter(await read('.agents/harness.md'));
    expect(data).toMatchObject({ id: 'buero-unterlagen', name: 'Büro Unterlagen' });
  });

  it('asks for --id before it writes anything when the slug cannot be an id', async () => {
    const cases: [string, RegExp][] = [
      ['2026-taxes', /^"2026-taxes", this folder's slug, starts with a digit — pass --id with lowercase letters/],
      ['x', /^"x", this folder's slug, is shorter than 2 characters — pass --id with /],
      ['a-very-long-folder-name-for-all-the-paperwork', /this folder's slug, is longer than 32 characters — pass --id with /],
      ['file', /^"file", this folder's slug, is a reserved word — pass --id with /],
      ['!!!', /^The folder name "!!!" leaves no id — pass --id with /],
    ];
    for (const [name, message] of cases) {
      await folder(name);
      await expect(planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs', configDir: config }), name).rejects.toThrow(message);
      expect(await readdir(repo), name).toEqual([]);
    }
    // Each is one sentence, and --id settles it.
    await expect(planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs' })).rejects.toThrow(new RegExp(`^[^.]+ — pass --id with ${ID_RULE}\\.$`));
    await docs({ id: 'misc' });
    expect(await read('.agents/harness.md')).toContain('\nid: misc\nname: "!!!"\n');
  });

  it('refuses an --id or --parent that breaks the pattern', async () => {
    for (const id of ['Taxes', '2026', 'a', 'taxes-', 'tax_es', 'null', 'workspace', 'x'.repeat(33)]) {
      await expect(planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs', id }), id).rejects.toThrow(/^--id "[^"]+" .+ — an id is lowercase letters/);
    }
    for (const parent of ['Home', 'null', 'paperwork']) {
      await expect(planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs', parent }), parent).rejects.toThrow(/^--parent "[^"]+" .+ leave it out for a top node\.$/);
    }
    expect(await readdir(repo)).toEqual([]);
  });

  it('follows ADR-0008 for what an id is', () => {
    for (const id of ['ab', 'shop', 'taxes-2026', 'a--b', 'a1', 'x'.repeat(32)]) expect(idProblem(id), id).toBeNull();
    for (const id of ['a', '1a', 'A1', 'ab-', '-ab', 'a_b', 'a b', 'ä1', 'x'.repeat(33), '']) expect(idProblem(id), id).not.toBeNull();
    expect([...RESERVED_IDS].sort()).toEqual(
      ['false', 'file', 'ftp', 'github', 'http', 'https', 'mailto', 'no', 'null', 'off', 'on', 'tel', 'true', 'workspace', 'yes'],
    );
    for (const word of RESERVED_IDS) expect(idProblem(word)).toBe('is a reserved word');
  });

  it('gives a registered folder its workspace id', async () => {
    const first = await folder('a/taxes');
    await mkdir(join(first, '.agents', 'issues'), { recursive: true });
    await registerWorkspace(config, first);
    const second = await folder('b/taxes');
    await mkdir(join(second, '.agents', 'issues'), { recursive: true });
    expect((await registerWorkspace(config, second)).id).toBe('taxes-2');

    await docs();

    expect(await read('.agents/harness.md')).toContain('\nid: taxes-2\nname: taxes\n');
  });

  it.skipIf(process.platform === 'win32')('knows its own registry entry through a symlinked path', async () => {
    const real = await folder('real/taxes');
    await mkdir(join(real, '.agents', 'issues'), { recursive: true });
    await symlink(join(base, 'real'), join(base, 'cloud'));
    expect(await registerWorkspace(config, join(base, 'cloud', 'taxes'))).toMatchObject({ id: 'taxes', repoPath: join(base, 'cloud', 'taxes') });

    await docs();

    expect(await read('.agents/harness.md')).toContain('\nid: taxes\nname: taxes\n');
  });

  it('asks for --id when the id or an alias belongs to a workspace at another path', async () => {
    const other = await folder('a/taxes');
    await docs({ id: 'tax' });
    await writeFile(join(other, '.agents', 'harness.md'), (await read('.agents/harness.md')).replace('parent: null', 'parent: null\naliases: [tx, t2]'));
    await mkdir(join(other, '.agents', 'issues'), { recursive: true });
    expect((await registerWorkspace(config, other)).id).toBe('taxes');
    await folder('b/taxes');

    // The registry's id, the identity file's id and one of its aliases.
    for (const id of [undefined, 'tax', 't2']) {
      const message = `The id "${id ?? 'taxes'}" already belongs to the workspace at ${other} — pass --id with another one (${ID_RULE}).`;
      await expect(planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs', configDir: config, id }), String(id)).rejects.toThrow(message);
    }
    expect(await readdir(repo)).toEqual([]);

    await docs({ id: 'taxes-private' });
    expect(await read('.agents/harness.md')).toContain('\nid: taxes-private\n');
  });

  it('reads aliases written one per line', async () => {
    const other = await folder('a/company');
    await docs();
    await writeFile(join(other, '.agents', 'harness.md'), (await read('.agents/harness.md')).replace('parent: null', 'parent: null\naliases:\n  - co\n  - "firm"  # short'));
    await registerWorkspace(config, other);
    await folder('b/office');

    expect(readIdentity(other)?.aliases).toEqual(['co', 'firm']);
    for (const id of ['co', 'firm']) {
      await expect(planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs', configDir: config, id }), id).rejects.toThrow(
        `The id "${id}" already belongs to the workspace at ${other} — `,
      );
    }
  });

  it('asks for --id when the folder is registered as `workspace`', async () => {
    await folder('!!!');
    await mkdir(join(repo, '.agents', 'issues'), { recursive: true });
    expect((await registerWorkspace(config, repo)).id).toBe('workspace');

    await expect(planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs', configDir: config })).rejects.toThrow(
      /^"workspace", this folder's workspace id, is a reserved word — pass --id with /,
    );
    expect(await tree(repo)).toEqual([]);

    // The second such folder is `workspace-2`, which fits the pattern.
    await folder('other/???');
    await mkdir(join(repo, '.agents', 'issues'), { recursive: true });
    expect((await registerWorkspace(config, repo)).id).toBe('workspace-2');
    await expect(planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs', configDir: config })).rejects.toThrow(
      /^"workspace-2", this folder's workspace id, stands in for a folder name that leaves no id — pass --id with /,
    );
    expect(await tree(repo)).toEqual([]);
  });

  it('never overwrites: a second run creates nothing and keeps what was edited', async () => {
    await writeFile(join(repo, 'notes.md'), '# Notes\n');
    await docs();
    await writeFile(join(repo, '.agents/harness.md'), (await read('.agents/harness.md')).replace(/<!--.*-->/, 'All the paperwork.'));
    await writeFile(join(repo, '.agents/issues/README.md'), '# Mine\n');
    const before = await tree(repo);

    // With the flag, without it, and with the values the file already has.
    for (const opts of [{ kind: 'docs' }, {}, { kind: 'docs', id: 'paperwork', name: 'paperwork' }]) {
      const again = await init({ configDir: config, ...opts });
      expect(again.filter((a) => !['same', 'keep'].includes(a.kind))).toEqual([]);
    }
    expect(await tree(repo)).toEqual(before);
    expect(await read('.agents/harness.md')).toContain('All the paperwork.');
    expect(await read('.agents/issues/README.md')).toBe('# Mine\n');
    expect(await read('notes.md')).toBe('# Notes\n');
  });

  it('stops when a flag disagrees with the identity file', async () => {
    await docs();

    await expect(planInit({ repoPath: repo, packageRoot: PKG, id: 'other' })).rejects.toThrow(
      '.agents/harness.md already has id: paperwork — init never overwrites it, and an id never changes.',
    );
    await expect(planInit({ repoPath: repo, packageRoot: PKG, parent: 'home' })).rejects.toThrow(
      '.agents/harness.md already has parent: null — init never overwrites it; edit the file to change it.',
    );
  });

  it('says so when an identity file from before has no usable id or parent', async () => {
    await docs();
    const text = await read('.agents/harness.md');
    const cases = [
      [text.replace('id: paperwork\n', ''), '.agents/harness.md has no id — an id is lowercase letters'],
      [text.replace('id: paperwork', 'id: 2026'), '.agents/harness.md has the id "2026", which starts with a digit — an id is lowercase letters'],
      [text.replace('parent: null', 'parent: Home'), '.agents/harness.md has the parent "Home", which doesn\'t fit the pattern — a parent is another harness\'s id or null; edit the file.'],
    ];
    for (const [content, message] of cases) {
      await writeFile(join(repo, '.agents/harness.md'), content);
      for (const opts of [{}, { id: 'paperwork' }, { upgrade: true }]) {
        await expect(planInit({ repoPath: repo, packageRoot: PKG, ...opts }), message).rejects.toThrow(message);
      }
    }
  });

  // The manifest remembers the scaffold, so the kind doesn't hang on one line.
  it('stays a docs harness when the identity file is damaged', async () => {
    const damage: Record<string, (text: string) => string> = {
      bom: (text) => `\uFEFF${text}`,
      'blank-line': (text) => `\n${text}`,
      'no-type': (text) => text.replace('type: docs\n', ''),
      'other-case': (text) => text.replace('type: docs', 'type: Docs'),
    };
    for (const [what, change] of Object.entries(damage)) {
      await folder(what);
      await docs();
      await writeFile(join(repo, '.agents/harness.md'), change(await read('.agents/harness.md')));

      for (const upgrade of [false, true]) {
        const again = await init({ upgrade, configDir: config });
        expect(again.filter((a) => !['same', 'keep'].includes(a.kind)), what).toEqual([]);
      }
      expect(await tree(repo), what).toEqual(DOCS_FILES);
      await expect(planInit({ repoPath: repo, packageRoot: PKG, kind: 'code' }), what).rejects.toThrow('This folder already holds a docs harness, ');
    }
    const manifest = JSON.parse(await read('.agents/.loopboard/manifest.json'));
    expect(manifest.scaffold).toBe('docs');

    // A manifest from before the field: files, and no skill among them.
    await writeFile(join(repo, '.agents/.loopboard/manifest.json'), JSON.stringify({ version: manifest.version, files: manifest.files }));
    await rm(join(repo, '.agents/harness.md'));
    await expect(planInit({ repoPath: repo, packageRoot: PKG })).rejects.toThrow('This docs harness has lost .agents/harness.md');
  });

  it('writes a lost identity file again, and only with --kind docs', async () => {
    await docs({ id: 'papers' });
    await rm(join(repo, '.agents/harness.md'));
    const before = await tree(repo);

    for (const opts of [{}, { upgrade: true }, { upgrade: true, force: true }]) {
      await expect(planInit({ repoPath: repo, packageRoot: PKG, configDir: config, ...opts })).rejects.toThrow(
        "This docs harness has lost .agents/harness.md — run `loopboard init --kind docs` to write it again, with --id if its id was not the folder's; nothing was written.",
      );
    }
    await expect(planInit({ repoPath: repo, packageRoot: PKG, kind: 'code' })).rejects.toThrow('This folder already holds a docs harness, ');
    expect(await tree(repo)).toEqual(before);

    const actions = await docs({ id: 'papers', upgrade: true });
    expect(paths(actions, 'create')).toEqual(['.agents/harness.md']);
    expect(await read('.agents/harness.md')).toContain('\nid: papers\n');
    expect(await tree(repo)).toEqual(DOCS_FILES);
  });

  it.skipIf(!locks)('stops every run on an identity file it cannot read', async () => {
    await docs();
    await chmod(join(repo, '.agents/harness.md'), 0o000);
    for (const opts of [{}, { kind: 'docs' }, { kind: 'code' }, { upgrade: true }]) {
      await expect(planInit({ repoPath: repo, packageRoot: PKG, ...opts })).rejects.toThrow(".agents/harness.md can't be read — nothing was written.");
    }
  });

  it('leaves an index node alone', async () => {
    await mkdir(join(repo, '.agents'));
    await writeFile(join(repo, '.agents/harness.md'), '---\nschema: 1\nid: home\nname: Home\nkind: index\nparent: null\ncreated: 2026-10-13\n---\n');
    for (const opts of [{}, { kind: 'docs' }, { kind: 'code' }, { upgrade: true }]) {
      await expect(planInit({ repoPath: repo, packageRoot: PKG, ...opts })).rejects.toThrow(
        '.agents/harness.md says "kind: index", and init can\'t set up an index node yet — nothing was written.',
      );
    }
    expect(await tree(repo)).toEqual(['.agents/harness.md']);
  });

  it('knows a code harness by any of its folders, and says what it found', async () => {
    for (const mark of ['.agents/skills', '.agents/specs', '.agents/rules', '.agents/design']) {
      await folder(`code-${basename(mark)}`);
      await mkdir(join(repo, mark), { recursive: true });
      await expect(planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs' }), mark).rejects.toThrow(
        `This folder already holds a code harness (it has ${mark}), and --kind docs would mix the two — nothing was written.`,
      );
    }
    await folder('block-only');
    await writeFile(join(repo, 'AGENTS.md'), renderBlock(PKG, 'M001'));
    await expect(planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs' })).rejects.toThrow(
      'This folder already holds a code harness (AGENTS.md has the loopboard block, and no identity file says otherwise), and --kind docs would mix the two — nothing was written.',
    );
  });

  // A magazine's back issues are no harness; issue files are (ADR-0003).
  it('takes a folder with an issues/ folder of its own, unless issue files are in it', async () => {
    await mkdir(join(repo, 'issues'));
    await writeFile(join(repo, 'issues', '2024-03.pdf'), '');
    await expect(planInit({ repoPath: repo, packageRoot: PKG })).rejects.toThrow(/lives in \.\/, not \.agents\//);
    await docs();
    expect(await tree(repo)).toEqual([...DOCS_FILES, 'issues/2024-03.pdf']);
    expect((await init({ configDir: config })).filter((a) => !['same', 'keep'].includes(a.kind))).toEqual([]);

    await folder('legacy');
    await mkdir(join(repo, 'issues'));
    await writeFile(join(repo, 'issues', '0001-first.md'), '---\nid: 0001\ntitle: First\n---\n');
    await expect(planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs' })).rejects.toThrow(/upgrade my loopboard harness/);
  });

  it('treats --upgrade as a first run where there is nothing to upgrade', async () => {
    await docs({ upgrade: true });

    expect(await read('AGENTS.md')).toContain(`<!-- loopboard:migration ${latestMigration(PKG)} -->`);
    expect(await tree(repo)).toEqual(DOCS_FILES);
  });

  // Every target is asked before the first write.
  it('writes nothing when one file of the plan cannot be written', async () => {
    await mkdir(join(repo, 'AGENTS.md'));
    const plan = await planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs' });
    await expect(applyPlan(repo, plan, '0.0.0-test')).rejects.toThrow('AGENTS.md is a folder where init writes a file — nothing was written.');
    expect(await tree(repo)).toEqual([]);
  });

  it('says where it stopped when a write fails after the check', async () => {
    // A plan no run makes: its second file needs the first one as a folder.
    const plan: Action[] = [
      { path: 'notes', kind: 'create', content: '' },
      { path: 'notes/first.md', kind: 'create', content: '' },
    ];
    await expect(applyPlan(repo, plan, '0.0.0-test')).rejects.toThrow(
      /^init stopped at notes(\/first\.md)? \(E[A-Z]+\) with some files written — fix that and run it again: it only fills the gaps\.$/,
    );
  });

  it.skipIf(!locks)('writes nothing into a folder or a file that is read-only', async () => {
    await writeFile(join(repo, 'AGENTS.md'), '# Mine\n');
    await chmod(join(repo, 'AGENTS.md'), 0o444);
    const plan = await planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs' });
    await expect(applyPlan(repo, plan, '0.0.0-test')).rejects.toThrow("AGENTS.md can't be written to — nothing was written.");
    expect(await tree(repo)).toEqual(['AGENTS.md']);

    await folder('locked');
    await mkdir(join(repo, '.agents', 'issues'), { recursive: true });
    await chmod(join(repo, '.agents', 'issues'), 0o555);
    try {
      await expect(applyPlan(repo, await planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs' }), '0.0.0-test')).rejects.toThrow(
        ".agents/issues can't be written to — nothing was written.",
      );
      expect(await tree(repo)).toEqual([]);
    } finally {
      await chmod(join(repo, '.agents', 'issues'), 0o755);
    }
  });

  it('does not mix with a code harness, in either direction', async () => {
    await init();
    const code = await tree(repo);
    await expect(planInit({ repoPath: repo, packageRoot: PKG, kind: 'docs' })).rejects.toThrow(
      'This folder already holds a code harness (it has .agents/skills), and --kind docs would mix the two — nothing was written.',
    );
    expect(await tree(repo)).toEqual(code);

    await folder('other');
    await docs();
    await expect(planInit({ repoPath: repo, packageRoot: PKG, kind: 'code' })).rejects.toThrow(
      'This folder already holds a docs harness, and --kind code would mix the two — nothing was written.',
    );
    expect(await tree(repo)).toEqual(DOCS_FILES);
  });

  it('refuses a kind it does not know, extras, and identity flags for a code harness', async () => {
    const plan = (opts: Partial<Parameters<typeof planInit>[0]>) => planInit({ repoPath: repo, packageRoot: PKG, ...opts });

    // `code` is the default and stays what it was.
    expect(await plan({ kind: 'code' })).toEqual(await plan({}));
    expect(paths(await plan({}), 'create')).not.toContain('.agents/harness.md');
    await expect(plan({ kind: 'index' })).rejects.toThrow('--kind takes code or docs, not "index" — index nodes aren\'t built yet.');
    await expect(plan({ kind: 'Docs' })).rejects.toThrow('--kind takes code or docs, not "Docs".');
    await expect(plan({ kind: 'docs', withExtras: true })).rejects.toThrow('--with-extras adds skills, and a docs harness has none — leave it out.');
    for (const flag of [{ id: 'app' }, { name: 'App' }, { parent: 'home' }]) {
      await expect(plan(flag)).rejects.toThrow('--id, --name and --parent go into the identity file, which init writes with --kind docs only.');
      await expect(plan({ kind: 'code', ...flag })).rejects.toThrow(/--kind docs only/);
    }
    expect(await readdir(repo)).toEqual([]);
  });

  it('keeps a docs harness lean on init and init --upgrade, with or without --kind', async () => {
    await docs();
    const pkg = await fakePackage();
    try {
      await writeFile(join(pkg, 'scaffold/docs/issues/README.md'), '# Issues v2\n');
      await writeFile(join(pkg, 'scaffold/docs/projects/README.md'), '# Projects v2\n');
      await writeFile(join(pkg, 'scaffold/docs/issues/_templates/note.md'), '# Note\n');
      const block = await readFile(join(pkg, 'scaffold/docs/AGENTS.block.md'), 'utf8');
      await writeFile(join(pkg, 'scaffold/docs/AGENTS.block.md'), block.replace('## Workflow', '## Workflow v2'));
      await writeFile(join(repo, '.agents/projects/README.md'), '# My projects\n');

      const dry = await planInit({ repoPath: repo, packageRoot: pkg, upgrade: true });
      const actions = await init({ upgrade: true, kind: 'docs' }, pkg);

      expect(actions).toEqual(dry);
      expect(paths(actions, 'update')).toEqual(['.agents/issues/README.md']);
      expect(paths(actions, 'keep-modified')).toEqual(['.agents/projects/README.md']);
      expect(paths(actions, 'create')).toEqual(['.agents/issues/_templates/note.md']);
      expect(paths(actions, 'block')).toEqual(['AGENTS.md']);
      expect(await read('.agents/issues/README.md')).toBe('# Issues v2\n');
      expect(await read('.agents/projects/README.md')).toBe('# My projects\n');
      const agents = await read('AGENTS.md');
      expect(agents).toContain('## Workflow v2');
      expect(agents).toContain(`<!-- loopboard:migration ${latestMigration(PKG)} -->`);
      expect(agents).not.toContain('## Build & test');
      expect(await tree(repo)).toEqual([...DOCS_FILES, '.agents/issues/_templates/note.md'].sort());
    } finally {
      await rm(pkg, { recursive: true, force: true });
    }
  });

  it('appends the docs block to an AGENTS.md that is already there', async () => {
    await writeFile(join(repo, 'AGENTS.md'), '# Agents\n\nFile everything by year.\n');
    await writeFile(join(repo, 'CLAUDE.md'), 'Be brief.\n');
    await docs();

    const agents = await read('AGENTS.md');
    expect(agents.startsWith('# Agents\n\nFile everything by year.\n\n<!-- loopboard:start')).toBe(true);
    expect(agents).toContain(renderBlock(PKG, latestMigration(PKG), 'docs'));
    expect(await read('CLAUDE.md')).toBe('Be brief.\n');
  });

  // The docs variants (#0078): same markers as the code block, none of its code steps.
  it('ships a workflow block and READMEs without a verify command, specs or skills', async () => {
    const [code, block] = [renderBlock(PKG, 'M009').trimEnd().split('\n'), renderBlock(PKG, 'M009', 'docs').trimEnd().split('\n')];
    expect(block.slice(0, 3)).toEqual(code.slice(0, 3));
    expect(block.at(-1)).toBe(code.at(-1));

    await docs();
    const agents = await read('AGENTS.md');
    expect(agents).toContain(renderBlock(PKG, latestMigration(PKG), 'docs').trimEnd());
    expect(agents).not.toContain('## Build & test');
    const flat = agents.replace(/\s+/g, ' ');
    expect(flat).toContain('An issue is `done` when every acceptance criterion is ticked and the evidence is written in the issue');
    expect(flat).toContain('flip to `in-review` + `assignee: human` with a `## Review` section');

    const files = (await tree(repo)).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const text = await read(file);
      expect(text, file).not.toMatch(/\bverify\b|\bspecs?\b|architecture|skills?\b|SETUP\.md|\bgit\b/i);
    }
    // Commands read `loopboard …`; one line says when `npx loopboard …` works.
    const npx = (await Promise.all(files.map(read))).join('\n').match(/^.*npx loopboard.*$/gm);
    expect(npx).toEqual(['a board. Commands here read `loopboard …`; `npx loopboard …` works once the']);
  });

  it('carries the reserved fields and references into the docs issues README', async () => {
    const section = (text: string) => text.slice(text.indexOf('## Reserved fields and references'));
    const shipped = section(await readFile(join(PKG, '.agents/issues/README.md'), 'utf8'));

    expect(shipped).toContain('| `<id>:<path>` |');
    // Where no ADR is at hand, the README is the only place the id rule is written.
    for (const word of RESERVED_IDS) expect(shipped, word).toContain(`\`${word}\``);
    expect(section(await readFile(join(PKG, 'scaffold/docs/issues/README.md'), 'utf8'))).toBe(shipped);
  });

  // A template's placeholder link (`NNNN-issue-slug.md`) names a file to come.
  it('links to no path it did not create', async () => {
    await docs();
    const links: string[] = [];
    for (const file of (await tree(repo)).filter((f) => f.endsWith('.md'))) {
      for (const [, target] of (await read(file)).matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^[a-z]+:|^#/.test(target) || target.includes('NNNN')) continue;
        links.push(`${file} → ${target}`);
        expect(existsSync(join(repo, dirname(file), target.split('#')[0])), `${file} → ${target}`).toBe(true);
      }
    }
    expect(links.length).toBeGreaterThan(10);
    expect(links).toContain('AGENTS.md → .agents/harness.md');
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
