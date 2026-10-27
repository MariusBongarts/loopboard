import { expect, test } from '@playwright/test';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { e2eRoot } from './workspace';

// Spec § 9 — Help and onboarding.
test('open Help from anywhere, move between its pages, and go back', async ({ page }) => {
  await page.goto('/w/legacy-repo');
  await expect(page.locator('.feed-row').first()).toBeVisible();
  await page.keyboard.press('?');

  await expect(page).toHaveURL(/\/help\?from=legacy-repo$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Build with agents, steer from the board');
  const nav = page.getByRole('navigation', { name: 'Help Center' });
  await expect(nav.getByRole('link')).toHaveText([
    'Overview',
    'Working with AI agents',
    'Set up a repo',
    'Upgrade a harness',
    'Reference',
  ]);

  await nav.getByRole('link', { name: 'Reference' }).click();
  await expect(page).toHaveURL(/\/help\/reference\?from=legacy-repo$/);
  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    'The loop',
    'What lives where',
    'Statuses and fields',
    'Routines',
    'Keyboard shortcuts',
  ]);
  await expect(page.locator('.keys kbd')).toHaveText(['⌘K', 'C', '/', 'j', 'k', '[', '?', 'Esc']);
  await expect(page.getByRole('list', { name: 'Reference sections' }).getByRole('link')).toHaveCount(5);

  await page.getByRole('link', { name: '← Back to the board' }).click();
  await expect(page).toHaveURL(/\/w\/legacy-repo$/);
  await page.getByRole('link', { name: /Help/ }).click();
  await expect(page).toHaveURL(/\/help\?from=legacy-repo$/);
});

test('explore the loop diagram', async ({ page }) => {
  await page.goto('/help');
  const tabs = page.getByRole('tablist', { name: 'Steps of the loop' });
  await expect(tabs.getByRole('tab')).toHaveText(['Decide', 'Plan', 'Slice', 'Build', 'Verify', 'Steer']);
  await expect(tabs.getByRole('tab', { name: 'Decide' })).toHaveAttribute('aria-selected', 'true');

  await tabs.getByRole('tab', { name: 'Slice' }).click();
  const panel = page.getByRole('tabpanel');
  await expect(panel).toContainText('“break it into issues”');
  await expect(panel).toContainText('to-issues');

  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Build' })).toBeFocused();
  await expect(panel).toContainText('“implement #0012”');
  await expect(panel.getByRole('link', { name: 'Read the chapter →' })).toHaveAttribute('href', '/help/learn#loop');
});

test('copy the setup prompt', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/help/setup');
  await page.getByRole('button', { name: 'Copy setup prompt' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  const prompt = (await readFile('docs/setup-prompt.md', 'utf8')).trimEnd();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(prompt);
});

test('learn: every chapter, videos that follow the theme and play while on screen', async ({ page }) => {
  await page.goto('/help/learn');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Working with AI agents');
  await expect(page.locator('.chapter')).toHaveCount(8);
  const videos = page.locator('video[data-video]');
  await expect(videos).toHaveCount(6);
  await expect(videos.first()).toHaveAttribute('src', '/media/learn-memory-light.mp4');
  await expect(videos.first()).toHaveAttribute('poster', '/media/learn-memory-light.jpg');
  const sections = page.getByRole('list', { name: 'Working with AI agents sections' });
  await sections.getByRole('link', { name: 'Agents forget, the repo remembers' }).click();
  await expect.poll(() => videos.first().evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
  await expect.poll(() => videos.last().evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);

  await sections.getByRole('link', { name: 'You steer from the board' }).click();
  await expect(page).toHaveURL(/\/help\/learn#steer$/);
  await expect.poll(() => videos.last().evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
  await expect.poll(() => videos.first().evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(videos.first()).toHaveAttribute('src', '/media/learn-memory-dark.mp4');
});

test('learn: reduced motion keeps the videos still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/help/learn');
  const first = page.locator('video[data-video]').first();
  await expect(first).toHaveJSProperty('readyState', 4);
  await page.waitForTimeout(600);
  expect(await first.evaluate((v: HTMLVideoElement) => ({ paused: v.paused, time: v.currentTime }))).toEqual({ paused: true, time: 0 });
});

test('learn: Matt Pocock’s videos load from YouTube only when clicked', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    if (/youtube|ytimg|googlevideo/.test(r.url())) external.push(r.url());
  });
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }));
  await page.goto('/help/learn#sources');
  const cards = page.locator('.source-video');
  await expect(cards).toHaveCount(6);
  await expect(cards.first().getByRole('link', { name: 'Open on YouTube' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=M6mYodf0dJM');
  expect(external).toEqual([]);

  await cards.first().getByRole('button', { name: /loads from YouTube/ }).click();
  await expect(cards.first().locator('iframe')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/M6mYodf0dJM?autoplay=1&rel=0');
  expect(external).toEqual(['https://www.youtube-nocookie.com/embed/M6mYodf0dJM?autoplay=1&rel=0']);
});

test('upgrade guide: harness levels per repo and the upgrade prompts', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const agents = join(e2eRoot(), 'demo-repo', 'AGENTS.md');
  await writeFile(agents, '# Demo\n\n<!-- loopboard:migration M001 -->\n');
  try {
    const migrations = (await readFile('MIGRATIONS.md', 'utf8')).match(/^## M\d{3}/gm) ?? [];
    await page.goto('/help/upgrade');
    const demo = page.locator('tr[data-workspace="demo-repo"]');
    await expect(demo).toContainText('M001');
    await expect(demo).toContainText(`${migrations.length - 1} behind`);
    const legacy = page.locator('tr[data-workspace="legacy-repo"]');
    await expect(legacy).toContainText('No AGENTS.md');
    await expect(legacy).toContainText('ai/ root');
    await expect(page.locator('.migrations li')).toHaveCount(migrations.length);

    await page.getByRole('button', { name: 'Copy request' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('upgrade my loopboard harness');

    await page.getByRole('button', { name: 'Copy upgrade prompt' }).click();
    const doc = (await readFile('docs/upgrade-prompt.md', 'utf8')).trimEnd();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(doc.replaceAll('<path-to-loopboard>', resolve('.')));
  } finally {
    await rm(agents, { force: true });
  }
});

test('first visit with no workspaces', async ({ page }) => {
  await page.route('**/api/workspaces', (route) =>
    route.fulfill({ json: { workspaces: [], lastUsed: null } }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  await expect(page.locator('.copy-prompt pre')).toContainText('npx loopboard init');
  await page.getByRole('button', { name: 'add it here' }).click();
  await expect(page.getByRole('dialog', { name: 'Add workspace' })).toBeVisible();
});

test('a set-up workspace with no issues yet', async ({ page }) => {
  const repo = join(e2eRoot(), 'empty-repo');
  await mkdir(join(repo, '.agents', 'issues'), { recursive: true });
  const res = await page.request.post('/api/workspaces', { data: { path: repo } });
  expect(res.status()).toBe(201);
  try {
    await page.goto('/w/empty-repo');
    await expect(page.getByRole('heading', { name: 'Nothing here yet' })).toBeVisible();
    await expect(page.locator('.first-steps li')).toHaveCount(3);
    await expect(page.getByText('The board appears here once there are issues.')).toBeVisible();
    await page.locator('.first-steps').getByRole('button', { name: 'New issue' }).click();
    await expect(page.getByRole('dialog', { name: 'New issue' })).toBeVisible();
  } finally {
    await page.request.delete('/api/workspaces/empty-repo');
  }
});

test('a workspace whose folder is gone comes back on its own', async ({ page }) => {
  const repo = join(e2eRoot(), 'flaky-repo');
  await mkdir(join(repo, '.agents', 'issues'), { recursive: true });
  expect((await page.request.post('/api/workspaces', { data: { path: repo } })).status()).toBe(201);
  await rm(join(repo, '.agents'), { recursive: true });

  await page.goto('/w/flaky-repo');
  await expect(page.getByRole('heading', { name: 'flaky-repo has no workflow folder' })).toBeVisible();
  await expect(page.locator('.welcome-card code').first()).toHaveText(join(repo, '.agents'));
  await expect(page.locator('.ws-current')).toContainText('flaky-repo');

  await mkdir(join(repo, '.agents', 'issues'), { recursive: true });
  await expect(page.getByRole('heading', { name: 'Nothing here yet' })).toBeVisible({ timeout: 8000 });

  await rm(join(repo, '.agents'), { recursive: true });
  await page.reload();
  await page.getByRole('button', { name: 'Forget this workspace' }).click();
  await expect(page).toHaveURL(/\/w\/demo-repo$/);
});
