import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { request } from 'node:http';
import { copyFileSync, existsSync, lstatSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { git, loopboard, repo, sandbox, serve } from './cli';

// Specs § 1, § 7, § 8 and § 10 — the real `loopboard` binary, end to end.
let box: { dir: string; config: string };
test.beforeEach(() => {
  box = sandbox();
});
test.afterEach(() => {
  rmSync(box.dir, { recursive: true, force: true });
});

test.describe('§ 1 running loopboard', () => {
  test('open the board for the repo I am in; a second repo joins the running server', async ({ page }) => {
    const app = repo(box.dir, 'alpha');
    const server = await serve(['--port', '0'], app, box.config);
    try {
      await page.goto(server.url);
      await expect(page.locator('.feed-row')).toHaveText([/First/]);
      await expect(page).toHaveTitle('alpha · loopboard');

      const beta = repo(box.dir, 'beta', 'ai');
      const second = loopboard(['--no-open'], beta, box.config);
      expect(second.status).toBe(0);
      expect(second.stdout).toContain(`loopboard is already running — opened http://127.0.0.1:${server.port}/w/beta`);
      await page.goto(`http://127.0.0.1:${server.port}/w/beta`);
      await page.locator('.card').first().click();
      await expect(page.getByRole('dialog', { name: 'Issue detail' }).getByRole('button', { name: 'Copy path' })).toHaveAttribute('title', 'ai/issues/0001-first.md');
    } finally {
      server.proc.kill();
    }
  });

  test('a repo without a root explains what to do', () => {
    const plain = repo(box.dir, 'plain', null);
    const r = loopboard(['--no-open'], plain, box.config);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('No .agents/ (or legacy ai/) folder with issues/');
    expect(r.stderr).toContain('npx loopboard init');
  });

  test('only this machine can use the server; a second board takes the next port', async () => {
    const first = await serve(['--port', '0'], repo(box.dir, 'one'), box.config);
    const other = await serve(['--port', String(first.port)], repo(box.dir, 'two'), join(box.dir, 'other-config'));
    try {
      expect(other.port).toBe(first.port + 1);
      const status = await new Promise<number>((resolve) => {
        const req = request({ host: '127.0.0.1', port: first.port, path: '/api/workspaces', headers: { host: `evil.example:${first.port}` } }, (res) =>
          resolve(res.statusCode ?? 0),
        );
        req.end();
      });
      expect(status).toBe(403);
    } finally {
      first.proc.kill();
      other.proc.kill();
    }
  });

  test('every command runs from another folder', async () => {
    const elsewhere = repo(box.dir, 'elsewhere', null);
    const app = join(box.dir, 'app');
    expect(loopboard(['init', '../app'], elsewhere, box.config).status).toBe(0);
    writeFileSync(join(app, '.agents/issues/0001-first.md'), '---\nid: 0001\ntitle: First\nstatus: todo\n---\n');
    expect(loopboard(['next-id', 'issue', '../app'], elsewhere, box.config).stdout.trim()).toBe('0002');
    expect(loopboard(['check', '../app'], elsewhere, box.config).status).toBe(0);
    expect(loopboard(['renumber', '0001', '--path', '../app'], elsewhere, box.config).stdout).toContain('moved issues/0001-first.md → issues/0002-first.md');

    const server = await serve(['--port', '0', '../app'], elsewhere, box.config);
    try {
      const data = await (await fetch(server.url.replace('/w/app', '/api/w/app/data'))).json();
      expect(data.issues.map((i: { id: string }) => i.id)).toEqual(['0002']);
    } finally {
      server.proc.kill();
    }
    expect(readdirSync(elsewhere)).toEqual([]);
  });

  test('a clone that is not built says what to run', () => {
    const clone = join(box.dir, 'clone');
    mkdirSync(join(clone, 'bin'), { recursive: true });
    writeFileSync(join(clone, 'package.json'), '{ "name": "loopboard", "type": "module" }\n');
    copyFileSync(join(process.cwd(), 'bin', 'loopboard.js'), join(clone, 'bin', 'loopboard.js'));
    const r = loopboard(['--version'], box.dir, box.config, join(clone, 'bin', 'loopboard.js'));
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/^loopboard isn't built yet: run `pnpm build` in .+, then try again\.\n$/);
  });

  test('a flag the command does not know stops it', () => {
    const plain = repo(box.dir, 'plain', null);
    const r = loopboard(['init', '--dry'], plain, box.config);
    expect(r.status).toBe(1);
    expect(r.stderr).toBe('Unknown flag --dry: `loopboard init` takes --with-extras, --upgrade, --force, --dry-run, --kind, --id, --name, --parent.\n');
    expect(loopboard(['init', '--help'], plain, box.config).stdout).toContain('Usage');
    expect(readdirSync(plain)).toEqual([]);

    const app = repo(box.dir, 'app');
    const board = loopboard(['--no-open', '--port', '0', '--strict'], app, box.config);
    expect(board.status).toBe(1);
    expect(board.stderr).toBe('Unknown flag --strict: `loopboard [path]` takes --port, --no-open.\n');
    expect(existsSync(box.config)).toBe(false);

    // A flag with a value never takes a positional's place.
    expect(loopboard(['renumber', '0001', '--path', '../app'], plain, box.config).stdout).toContain('moved issues/0001-first.md → issues/0002-first.md');
    expect(loopboard(['renumber', '0002', '--path'], plain, box.config).stderr).toBe('Flag --path needs a value.\n');
  });
});

test.describe('§ 7 workspaces from the terminal', () => {
  // Registers repos as a user does: the first starts a board, the rest join it.
  async function board(...repos: string[]) {
    const server = await serve(['--port', '0'], repos[0], box.config);
    for (const r of repos.slice(1)) expect(loopboard(['--no-open'], r, box.config).status).toBe(0);
    return server;
  }

  test('list workspaces from the terminal', async () => {
    const beta = repo(box.dir, 'beta', 'ai');
    const server = await board(repo(box.dir, 'alpha'), beta);
    const stopped = new Promise((r) => server.proc.once('exit', r));
    server.proc.kill();
    await stopped;
    rmSync(beta, { recursive: true });

    // box.dir has no root and no git, and no board is running any more.
    const list = loopboard(['workspaces'], box.dir, box.config);
    expect(list.status).toBe(0);
    expect(list.stdout).toMatch(/^ID\s+NAME\s+FOLDER\s+PATH$/m);
    expect(list.stdout).toMatch(/^alpha\s+alpha\s+exists\s+.*alpha[\\/]\.agents$/m);
    expect(list.stdout).toMatch(/^beta\s+beta\s+missing\s+.*beta[\\/]ai$/m);

    const data = loopboard(['workspaces', '--json'], box.dir, box.config);
    expect(JSON.parse(data.stdout)).toEqual([
      { id: 'alpha', name: 'alpha', path: expect.stringMatching(/alpha[\\/]\.agents$/), exists: true },
      { id: 'beta', name: 'beta', path: expect.stringMatching(/beta[\\/]ai$/), exists: false },
    ]);

    expect(loopboard(['workspaces'], box.dir, join(box.dir, 'empty-config')).stdout).toContain('No workspaces registered');
  });

  test('forget workspaces from the terminal', async ({ page }) => {
    const beta = repo(box.dir, 'beta');
    const server = await board(repo(box.dir, 'alpha'), beta);
    const menu = async () => {
      await page.locator('.ws-current').click();
      return page.getByRole('menuitemradio');
    };
    try {
      await page.goto(server.url);
      await expect(await menu()).toHaveText([/alpha/, /beta/]);
      const views = await page.request.put(`http://127.0.0.1:${server.port}/api/w/beta/views`, {
        data: { views: [{ id: 'v1', name: 'Mine', query: {} }] },
      });
      expect(views.status()).toBe(200);

      const unknown = loopboard(['workspaces', 'forget', 'beta', 'nope'], box.dir, box.config);
      expect(unknown.status).toBe(1);
      expect(unknown.stderr).toContain('unknown workspace: nope — nothing was forgotten');
      expect(loopboard(['workspaces', '--json'], box.dir, box.config).stdout).toContain('"id": "beta"');

      const forgot = loopboard(['workspaces', 'forget', 'beta'], box.dir, box.config);
      expect(forgot.status).toBe(0);
      expect(forgot.stdout).toMatch(/^forgot beta  \(.*beta[\\/]\.agents\)$/m);
      expect(forgot.stdout).toContain(`saved views stay in ${join(box.config, 'views', 'beta.json')}`);
      expect(forgot.stdout).toContain('no file in a harness was touched');
      expect(existsSync(join(box.config, 'views', 'beta.json'))).toBe(true);
      expect(readFileSync(join(beta, '.agents/issues/0001-first.md'), 'utf8')).toContain('title: First');

      await page.reload();
      await expect(await menu()).toHaveText([/alpha/]);
    } finally {
      server.proc.kill();
    }
  });
});

test.describe('§ 8 setup and upgrades', () => {
  test('set up an empty repo, then run init again', () => {
    const app = repo(box.dir, 'fresh', null);
    const r = loopboard(['init'], app, box.config);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/created \(\d+\)/);
    expect(r.stdout).toContain('Next: ask your agent to follow .agents/SETUP.md');
    for (const f of ['AGENTS.md', 'CLAUDE.md', '.agents/SETUP.md', '.agents/issues/README.md', '.agents/specs/_specs.md', '.agents/skills/CREDITS.md']) {
      expect(existsSync(join(app, f)), f).toBe(true);
    }
    expect(lstatSync(join(app, '.claude/skills/implement')).isSymbolicLink() || existsSync(join(app, '.claude/skills/implement/SKILL.md'))).toBe(true);
    expect(readFileSync(join(app, 'AGENTS.md'), 'utf8')).toMatch(/<!-- loopboard:migration M\d{3} -->/);

    const again = loopboard(['init'], app, box.config);
    expect(again.stdout).toContain('Nothing to do — the workflow is already set up.');
  });

  test('set up a repo with its own instructions, with the extras', () => {
    const app = repo(box.dir, 'existing', null);
    mkdirSync(join(app, '.cursor'));
    writeFileSync(join(app, 'AGENTS.md'), '# Agents\n\nUse tabs.\n');
    writeFileSync(join(app, 'CLAUDE.md'), 'Be brief.\n');
    expect(loopboard(['init', '--with-extras'], app, box.config).status).toBe(0);
    expect(readFileSync(join(app, 'AGENTS.md'), 'utf8')).toMatch(/^# Agents\n\nUse tabs\.\n\n<!-- loopboard:start/);
    expect(readFileSync(join(app, 'CLAUDE.md'), 'utf8')).toBe('Be brief.\n');
    expect(existsSync(join(app, '.agents/skills/tdd/SKILL.md'))).toBe(true);
    expect(existsSync(join(app, '.cursor/skills/tdd'))).toBe(true);
  });

  test('a legacy ai/ harness is sent to upgrade-harness', () => {
    const r = loopboard(['init'], repo(box.dir, 'legacy', 'ai'), box.config);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('upgrade my loopboard harness');
  });

  // #0078. The sandbox is no git repository.
  test('set up a folder without code, then open its board', async ({ page }) => {
    const office = repo(box.dir, 'Büro Unterlagen', null);
    writeFileSync(join(office, 'lease.txt'), 'Signed 2026-10-01.\n');

    const r = loopboard(['init', '--kind', 'docs'], office, box.config);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('created (11):');
    expect(r.stdout).toContain('Next: say what this folder is for in .agents/harness.md and AGENTS.md, then run `loopboard` — opening the folder is what keeps its id from going to another one.');
    expect(readdirSync(office).sort()).toEqual(['.agents', 'AGENTS.md', 'CLAUDE.md', 'lease.txt']);
    expect(readdirSync(join(office, '.agents')).sort()).toEqual(['.loopboard', 'harness.md', 'issues', 'projects']);
    expect(readFileSync(join(office, '.agents/harness.md'), 'utf8')).toMatch(
      /^---\nschema: 1\nid: buero-unterlagen\nname: Büro Unterlagen\nkind: harness\ntype: docs\nparent: null\ncreated: \d{4}-\d{2}-\d{2}\n---\n/,
    );
    const agents = readFileSync(join(office, 'AGENTS.md'), 'utf8');
    expect(agents).toMatch(/<!-- loopboard:migration M\d{3} -->/);
    expect(agents).not.toContain('Build & test');
    expect(existsSync(box.config)).toBe(false);
    expect(loopboard(['init'], office, box.config).stdout).toContain('Nothing to do — the workflow is already set up.');

    expect(loopboard(['next-id', 'issue'], office, box.config).stdout.trim()).toBe('0001');
    expect(loopboard(['check', '--strict'], office, box.config).stdout).toBe('✓ no duplicate numbers\n');

    const server = await serve(['--port', '0'], office, box.config);
    try {
      expect(server.url).toMatch(/\/w\/buero-unterlagen$/);
      await page.goto(server.url);
      await expect(page).toHaveTitle('Büro Unterlagen · loopboard');
      const created = await page.request.post(`http://127.0.0.1:${server.port}/api/w/buero-unterlagen/issues`, {
        data: { title: 'File the lease', category: 'task' },
      });
      expect(created.status()).toBe(201);
      await page.reload();
      await expect(page.locator('.feed-row', { hasText: 'File the lease' })).toBeVisible();
      expect(readFileSync(join(office, '.agents/issues/0001-file-the-lease.md'), 'utf8')).toContain('## What needs to be done\n');
      // No specs here, and the Specs entry says so instead of loading for good.
      await page.locator('.rail-nav', { hasText: 'Specs' }).click();
      await expect(page.getByRole('heading', { name: 'This workspace has no specs.' })).toBeVisible();
      await expect(page.getByText('Loading specs…')).toHaveCount(0);
    } finally {
      server.proc.kill();
    }
  });

  test('init --kind docs asks for an id it cannot derive and never mixes with a code harness', () => {
    const taxes = repo(box.dir, '2026-taxes', null);
    const refused = loopboard(['init', '--kind', 'docs'], taxes, box.config);
    expect(refused.status).toBe(1);
    expect(refused.stderr).toMatch(/^"2026-taxes", this folder's slug, starts with a digit — pass --id with lowercase letters, [^\n]+\.\n$/);
    const dry = loopboard(['init', '--kind', 'docs', '--id', 'taxes', '--dry-run'], taxes, box.config);
    expect(dry.stdout).toContain('would be created (11):\n  .agents/harness.md\n');
    expect(readdirSync(taxes)).toEqual([]);
    expect(loopboard(['init', '--kind', 'docs', '--id', 'taxes'], taxes, box.config).status).toBe(0);
    expect(readFileSync(join(taxes, '.agents/harness.md'), 'utf8')).toContain('\nid: taxes\nname: "2026-taxes"\n');
    expect(existsSync(join(taxes, '.claude'))).toBe(false);

    const app = repo(box.dir, 'app', null);
    expect(loopboard(['init'], app, box.config).status).toBe(0);
    const mixed = loopboard(['init', '--kind', 'docs'], app, box.config);
    expect(mixed.status).toBe(1);
    expect(mixed.stderr).toBe('This folder already holds a code harness (it has .agents/skills), and --kind docs would mix the two — nothing was written.\n');
    expect(existsSync(join(app, '.agents/harness.md'))).toBe(false);

    // A docs harness stays one without its identity file: the manifest remembers.
    rmSync(join(taxes, '.agents/harness.md'));
    const lost = loopboard(['init', '--upgrade'], taxes, box.config);
    expect(lost.status).toBe(1);
    expect(lost.stderr).toMatch(/^This docs harness has lost \.agents\/harness\.md — run `loopboard init --kind docs` to write it again, [^\n]+\n$/);
    expect(existsSync(join(taxes, '.agents/skills'))).toBe(false);
    expect(loopboard(['init', '--kind', 'docs', '--id', 'taxes'], taxes, box.config).stdout).toContain('created (1):\n  .agents/harness.md\n');
  });

  test('upgrade updates untouched files and skips edited ones', () => {
    const app = repo(box.dir, 'old', null);
    loopboard(['init'], app, box.config);
    // Simulate an older install: an untouched triage and an edited implement.
    const manifestPath = join(app, '.agents/.loopboard/manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    writeFileSync(join(app, '.agents/skills/triage/SKILL.md'), '# Triage v0\n');
    manifest.files['.agents/skills/triage/SKILL.md'] = createHash('sha256').update('# Triage v0\n').digest('hex');
    writeFileSync(manifestPath, JSON.stringify(manifest));
    writeFileSync(join(app, '.agents/skills/implement/SKILL.md'), '# My implement\n');

    const dry = loopboard(['init', '--upgrade', '--dry-run'], app, box.config);
    expect(dry.stdout).toContain('would be updated (1):\n  .agents/skills/triage/SKILL.md');
    expect(readFileSync(join(app, '.agents/skills/triage/SKILL.md'), 'utf8')).toBe('# Triage v0\n');

    const r = loopboard(['init', '--upgrade'], app, box.config);
    expect(r.stdout).toContain('skipped (edited locally) (1):\n  .agents/skills/implement/SKILL.md');
    expect(r.stdout).toContain('upgrade my loopboard harness');
    expect(readFileSync(join(app, '.agents/skills/triage/SKILL.md'), 'utf8')).toContain('# Triage');
    expect(readFileSync(join(app, '.agents/skills/implement/SKILL.md'), 'utf8')).toBe('# My implement\n');
  });
});

test.describe('§ 10 issue and project numbers', () => {
  test('next-id sees other branches; check finds a collision; renumber fixes it', () => {
    const app = repo(box.dir, 'numbers');
    git(app, 'init', '-q', '-b', 'main');
    git(app, 'add', '.');
    git(app, 'commit', '-qm', 'base');
    git(app, 'checkout', '-qb', 'feat');
    writeFileSync(join(app, '.agents/issues/0002-on-feat.md'), '---\nid: 0002\ntitle: On feat\n---\n');
    git(app, 'add', '.');
    git(app, 'commit', '-qm', 'feat');
    git(app, 'checkout', '-q', 'main');

    expect(loopboard(['next-id', 'issue'], app, box.config).stdout.trim()).toBe('0003');
    expect(loopboard(['next-id', 'project'], app, box.config).stdout.trim()).toBe('01');

    writeFileSync(join(app, '.agents/issues/0002-on-main.md'), '---\nid: 0002\ntitle: On main\n---\n\nSee #0099.\n');
    const plain = loopboard(['check'], app, box.config);
    expect(plain.status).toBe(0);
    expect(plain.stdout).toContain('! issues/0002-on-main.md: #0099 points at no issue');
    expect(loopboard(['check', '--strict'], app, box.config).status).toBe(1);
    const branches = loopboard(['check', '--branches'], app, box.config);
    expect(branches.status).toBe(1);
    expect(branches.stdout).toContain('✗ duplicate issue 0002:');

    // Twins in the working tree: renumber needs --file.
    writeFileSync(join(app, '.agents/issues/0002-twin.md'), '---\nid: 0002\ntitle: Twin\n---\n');
    expect(loopboard(['check'], app, box.config).status).toBe(1);
    const refused = loopboard(['renumber', '0002'], app, box.config);
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain('0002-on-main.md');
    expect(refused.stderr).toContain('0002-twin.md');
    const moved = loopboard(['renumber', '0002', '--file', '0002-twin.md'], app, box.config);
    expect(moved.status).toBe(0);
    expect(moved.stdout).toContain('moved issues/0002-twin.md → issues/0003-twin.md');
    expect(readFileSync(join(app, '.agents/issues/0003-twin.md'), 'utf8')).toContain('id: 0003');

    // The one left still collides with the branch; move it too.
    expect(loopboard(['renumber', '0002'], app, box.config).stdout).toContain('→ issues/0004-on-main.md');
    expect(loopboard(['check', '--branches'], app, box.config).status).toBe(0);
  });

  test('check lists the files the board skips', () => {
    const app = repo(box.dir, 'skipped');
    // The mis-named ones carry the highest numbers, so `next-id` shows whether they count.
    writeFileSync(join(app, '.agents/issues/0005-Tax-Return.md'), '---\nid: 0005\ntitle: Tax return\n---\n');
    writeFileSync(join(app, '.agents/issues/0003-broken.md'), '---\nid: 0003\ntitle: Broken: unquoted colon\n---\n');
    mkdirSync(join(app, '.agents/projects/02-Offline-Mode'), { recursive: true });

    const plain = loopboard(['check'], app, box.config);
    expect(plain.status).toBe(0);
    expect(plain.stdout).toContain('! issues/0005-Tax-Return.md: skipped — name must be NNNN-slug.md');
    expect(plain.stdout).toContain('! issues/0003-broken.md: skipped — invalid frontmatter: ');
    expect(plain.stdout).toContain('! projects/02-Offline-Mode: skipped — folder must be named NN-slug');
    expect(plain.stdout).toContain('✓ no duplicate numbers (3 skipped files)');
    expect(loopboard(['check', '--strict'], app, box.config).status).toBe(1);
    expect(loopboard(['next-id', 'issue'], app, box.config).stdout.trim()).toBe('0006');
    expect(loopboard(['next-id', 'project'], app, box.config).stdout.trim()).toBe('03');
  });

  test('renumber a project, with --dry-run first', () => {
    const app = repo(box.dir, 'projects');
    mkdirSync(join(app, '.agents/projects/01-launch'), { recursive: true });
    writeFileSync(join(app, '.agents/projects/01-launch/prd.md'), '# Launch\n');
    writeFileSync(join(app, '.agents/issues/0001-first.md'), '---\nid: 0001\ntitle: First\nstatus: todo\nproject: 01-launch\n---\n\nSee [the PRD](../projects/01-launch/prd.md).\n');
    const dry = loopboard(['renumber', '01', '04', '--dry-run'], app, box.config);
    expect(dry.status).toBe(0);
    expect(existsSync(join(app, '.agents/projects/01-launch'))).toBe(true);
    expect(loopboard(['renumber', '01', '04'], app, box.config).status).toBe(0);
    expect(existsSync(join(app, '.agents/projects/04-launch/prd.md'))).toBe(true);
    const issue = readFileSync(join(app, '.agents/issues/0001-first.md'), 'utf8');
    expect(issue).toContain('project: 04-launch');
    expect(issue).toContain('(../projects/04-launch/prd.md)');
  });
});
