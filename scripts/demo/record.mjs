// Records the README demo (#0036): a scripted agent edits the issue files of a
// demo repo while Playwright films the real board updating live, in the light
// and the dark theme. Frames are captured step by step, so the same UI always
// yields the same GIFs.
// Usage: pnpm demo [--out <dir>] [--frames <dir>]
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { encodeGif } from './gif.mjs';
import { Film, installStage } from './stage.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const outDir = arg('--out') ?? join(root, 'docs', 'media');
const framesDir = arg('--frames');
const THEMES = ['light', 'dark'];

const tmp = mkdtempSync(join(tmpdir(), 'loopboard-demo-'));
const repo = join(tmp, 'acme-notes');
const agents = join(repo, '.agents');
let server;
let browser;
try {
  copyWorkspace(join(here, 'workspace'), agents);
  mkdirSync(join(tmp, 'config'));
  process.env.BASE_PATH = repo;
  process.env.LOOPBOARD_CONFIG_DIR = join(tmp, 'config');
  server = await createServer({ root, configFile: join(root, 'vite.config.ts'), logLevel: 'error', server: { port: 5190, strictPort: false } });
  await server.listen();
  const baseURL = server.resolvedUrls.local[0].replace(/\/$/, '');
  // Software raster, no partial re-raster: the same pixels on every run.
  browser = await chromium.launch({ args: ['--disable-gpu', '--disable-partial-raster', '--disable-skia-runtime-opts', '--force-color-profile=srgb'] });

  for (const theme of THEMES) {
    copyWorkspace(join(here, 'workspace'), agents);
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: theme });
    const page = await context.newPage();
    await page.goto(`${baseURL}/w/acme-notes`);
    await page.locator('.rail-row', { hasText: 'Offline mode' }).click();
    await page.getByRole('button', { name: 'Hide feed' }).click();
    await page.locator('.col-todo [data-issue-id="0017"] .marker-waiting').waitFor();
    await page.mouse.move(0, 0);
    await page.evaluate(installStage);

    const film = new Film(page);
    await story(film, page);
    await context.close();

    if (framesDir) {
      const dir = join(framesDir, theme);
      mkdirSync(dir, { recursive: true });
      film.frames.forEach((f, i) => writeFileSync(join(dir, `${String(i).padStart(3, '0')}-${f.delay}ms.png`), f.png));
    }
    const gif = encodeGif(film.frames);
    const out = join(outDir, `demo-${theme}.gif`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, gif);
    console.log(`✓ demo (${theme}): ${film.frames.length} frames, ${(film.duration / 1000).toFixed(1)} s, ${(gif.length / 1024).toFixed(0)} KB → ${out}`);
  }
} finally {
  await browser?.close();
  await server?.close();
  rmSync(tmp, { recursive: true, force: true });
}

// The storyboard. Each agent step writes the files a real agent would write;
// the board only ever learns about them through its file watcher.
async function story(film, page) {
  const card = (column, id) => page.locator(`.col-${column} [data-issue-id="${id}"]`);
  const spot = (id) => page.locator(`[data-issue-id="${id}"] .card`);
  const queue = '0016-queue-edits-made-while-offline.md';
  const conflicts = '0017-resolve-conflicts-on-reconnect.md';

  await film.prompt();
  await film.hold(1600);

  await film.type('implement #0016');
  await film.say(`Read  .agents/issues/${queue}`, 500);
  editIssue(queue, [['status: todo', 'status: in-progress']]);
  await film.live(card('in-progress', '0016'));
  await film.say('status  todo → in-progress', 0);
  await film.spotlight([spot('0016')], 1300);
  await film.say('Edit  src/sync/queue.ts  +86 −4', 450);
  await film.say('Edit  src/sync/queue.test.ts  +52', 450);
  await film.say('✓ pnpm verify  214 passed', 600, 'ok');
  editIssue(queue, [
    ['status: in-progress', 'status: done'],
    [/- \[ \]/g, '- [x]'],
  ]);
  logSession('#0016', 'Offline edits go to a persistent queue and replay in order on reconnect.');
  await film.live(card('done', '0016'));
  await film.say('status  in-progress → done · session logged', 0);
  await film.spotlight([spot('0016')], 1600);

  await film.type('implement #0017');
  editIssue(conflicts, [['status: todo', 'status: in-progress']]);
  await film.live(card('in-progress', '0017'));
  await film.say('status  todo → in-progress', 0);
  await film.spotlight([spot('0017')], 1200);
  await film.say('Edit  src/sync/merge.ts  +121 −9', 450);
  await film.say('✓ pnpm verify  231 passed', 600, 'ok');
  await film.say('Needs a human: try it on two real devices', 700, 'warn');
  editIssue(conflicts, [
    ['status: in-progress', 'status: in-review'],
    ['assignee: agent', 'assignee: human'],
    [/- \[ \]/g, '- [x]'],
    [/$/, '\n## Review\n\n1. Edit the same note on two devices while offline.\n2. Reconnect both: separate lines merge, the same line shows "Two versions".\n'],
  ]);
  await film.live(card('in-review', '0017'));
  await film.say('status  in-review · assignee  human', 0);
  await film.spotlight([spot('0017'), page.locator('.rail-nav', { hasText: 'Needs you' })], 1800);

  // The human steers from the board.
  await film.click(spot('0017'));
  await page.getByRole('dialog', { name: 'Issue detail' }).getByText('Reconnect both').waitFor();
  await page.waitForTimeout(300);
  await film.glide({ x: 560, y: 650 }, 10);
  await film.hold(3600);
}

function editIssue(name, replacements) {
  edit(join(agents, 'issues', name), replacements);
}

function logSession(ref, note) {
  edit(join(agents, 'projects', '02-offline-mode', 'wip.md'), [
    ['## Activity log\n', `## Activity log\n\n### ${isoDate(0)} — ${ref}\n\n- ${note}\n`],
  ]);
}

function edit(file, replacements) {
  let text = readFileSync(file, 'utf8');
  for (const [from, to] of replacements) text = text.replace(from, to);
  writeFileSync(file, text);
}

// A fresh copy of the demo workspace, with {{today-N}} turned into real dates
// so relative labels ("yesterday", "3d ago") read the same on every run.
function copyWorkspace(from, to) {
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else writeFileSync(path, readFileSync(path, 'utf8').replace(/\{\{today(?:-(\d+))?\}\}/g, (_, n) => isoDate(Number(n ?? 0))));
    }
  };
  walk(to);
}

function isoDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
