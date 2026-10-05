import { expect, test } from '@playwright/test';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { e2eRoot } from './workspace';

// Spec § 9 — Help and onboarding.
test('open Help from anywhere, and go back', async ({ page }) => {
  await page.goto('/w/legacy-repo');
  await expect(page.locator('.feed-row').first()).toBeVisible();
  await page.keyboard.press('?');

  await expect(page).toHaveURL(/\/help\?from=legacy-repo$/);
  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    'Get started in another repo',
    'The loop',
    'What lives where',
    'Statuses and fields',
    'Keyboard shortcuts',
  ]);
  await expect(page.locator('.help-keys kbd')).toHaveText(['⌘K', 'C', '/', 'j', 'k', '[', '?', 'Esc']);

  await page.getByRole('link', { name: '← Back to the board' }).click();
  await expect(page).toHaveURL(/\/w\/legacy-repo$/);
  await page.getByRole('link', { name: /Help/ }).click();
  await expect(page).toHaveURL(/\/help\?from=legacy-repo$/);
});

test('copy the setup prompt', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/help');
  await page.getByRole('button', { name: 'Copy setup prompt' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  const prompt = (await readFile('docs/setup-prompt.md', 'utf8')).trimEnd();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(prompt);
});

test('first visit with no workspaces', async ({ page }) => {
  await page.route('**/api/workspaces', (route) =>
    route.fulfill({ json: { workspaces: [], lastUsed: null } }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  await expect(page.locator('.setup-prompt pre')).toContainText('npx loopboard init');
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
