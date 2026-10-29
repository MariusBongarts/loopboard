import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { e2eRoot, readIssueFile, writeIssueFile } from './workspace';

// Spec § 5 — Issue view (panel and page) and backlog.
test("see an issue's git history", async ({ page }) => {
  const repo = join(e2eRoot(), 'demo-repo');
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...args], { cwd: repo, stdio: 'pipe' });
  const file = '0007-fix-the-readme-typo.md';
  const original = await readIssueFile(file);
  try {
    git('init', '-q', '-b', 'main');
    git('add', '.');
    git('commit', '-qm', 'Import the fixture');
    await writeIssueFile(file, original.replace('status: todo', 'status: in-progress'));
    git('commit', '-qam', 'Start on the typo (#0007)');
    git('branch', 'fix/0007-readme');

    await page.goto('/w/demo-repo/inbox');
    await page.locator('.feed-row', { hasText: 'Fix the README typo' }).click();
    await page.locator('[data-issue-id="0007"] .card').click();
    const history = page.locator('details.activity');
    await history.locator('summary').click();
    await expect(history).toContainText('todo → in-progress');
    await expect(history).toContainText('Commits mentioning #0007');
    await expect(history.locator('.activity-branches code')).toHaveText(['fix/0007-readme']);
  } finally {
    await rm(join(repo, '.git'), { recursive: true, force: true });
    await writeIssueFile(file, original);
  }
});

test('tick a checklist item right in the issue view', async ({ page }) => {
  const file = '0002-cache-the-feed.md';
  const original = await readIssueFile(file);
  try {
    await page.goto('/w/demo-repo/inbox');
    await page.locator('.feed-row', { hasText: 'Cache the feed' }).click();
    await page.locator('[data-issue-id="0002"] .card').click();
    const box = page.locator('.issue-view-body input[data-task-index="0"]');
    await box.click();
    await expect.poll(() => readIssueFile(file)).toBe(original.replace('- [ ] Cache hit', '- [x] Cache hit'));
    await expect(box).toBeChecked();
  } finally {
    await writeIssueFile(file, original);
  }
});

test('open an issue in the side panel, follow a reference, copy its path, close with Esc', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/w/demo-repo/inbox');
  await page.locator('.feed-row', { hasText: 'Check the new layout by hand' }).click();
  await page.locator('[data-issue-id="0003"] .card').click();
  const panel = page.getByRole('dialog', { name: 'Issue detail' });
  await expect(panel.locator('.issue-view-title')).toHaveText('Check the new layout by hand');
  await expect(panel.getByRole('button', { name: 'Status: In review' })).toBeVisible();
  await expect(page.locator('.modal-backdrop, .drawer-backdrop')).toHaveCount(0);

  await panel.getByRole('button', { name: 'Copy path' }).click();
  await expect(page.locator('.toast')).toContainText('Path copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('.agents/issues/0003-check-the-new-layout.md');

  await expect(panel.locator('.issue-view-body')).toContainText('not #0099');
  await expect(panel.locator('.issue-view-body button.issue-ref[data-ref="0099"]')).toHaveCount(0);
  await panel.locator('.issue-view-body button.issue-ref[data-ref="0001"]').click();
  await expect(panel.locator('.issue-view-title')).toHaveText('Wire the export button');
  // No backdrop: the rest of the page stays usable next to the panel.
  await page.locator('.feed-row', { hasText: 'Wait for the vendor key' }).dblclick();
  await expect(panel.locator('.issue-view-title')).toHaveText('Wait for the vendor key');
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
});

test('step through the board in the panel, and resize it', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
  await page.locator('.feed-row', { hasText: 'Wire the export button' }).click();
  await page.locator('[data-issue-id="0001"] .card').click();
  const panel = page.getByRole('dialog', { name: 'Issue detail' });
  await expect(panel.locator('.issue-panel-pos')).toHaveText('1 / 6');
  await page.keyboard.press('j');
  await expect(panel.locator('.issue-view-title')).toHaveText('Wait for the vendor key');
  await panel.getByRole('button', { name: 'Next issue' }).click();
  await expect(panel.locator('.issue-view-title')).toHaveText('Cache the feed');
  await expect(panel.locator('.issue-panel-pos')).toHaveText('3 / 6');
  await page.keyboard.press('k');
  await expect(panel.locator('.issue-view-title')).toHaveText('Wait for the vendor key');

  const handle = panel.getByRole('separator', { name: 'Resize issue panel' });
  await expect(handle).toHaveAttribute('aria-valuenow', '620');
  await handle.focus();
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(handle).toHaveAttribute('aria-valuenow', '684');
  expect(Math.round((await panel.boundingBox())!.width)).toBe(684);
  await page.keyboard.press('Escape');
  await page.locator('[data-issue-id="0001"] .card').click();
  await expect(panel.getByRole('separator', { name: 'Resize issue panel' })).toHaveAttribute('aria-valuenow', '684');
  await panel.getByRole('separator', { name: 'Resize issue panel' }).dblclick();
  await expect(panel.getByRole('separator', { name: 'Resize issue panel' })).toHaveAttribute('aria-valuenow', '620');
});

test('open an issue as a page, go back, and an unknown id', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
  await page.locator('.feed-row', { hasText: 'Cache the feed' }).click();
  await page.locator('[data-issue-id="0002"] .card').click();
  await page.getByRole('dialog', { name: 'Issue detail' }).getByRole('button', { name: 'Open as page' }).click();
  await expect(page).toHaveURL(/\/w\/demo-repo\/issues\/0002$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Cache the feed' })).toBeVisible();
  const details = page.getByRole('complementary', { name: 'Details' });
  await expect(details.getByRole('button', { name: 'Status: In progress' })).toBeVisible();
  await expect(details).toContainText('.agents/issues/0002-cache-the-feed.md');
  await expect(page.getByRole('dialog', { name: 'Issue detail' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/w\/demo-repo\/inbox$/);

  await page.goto('/w/demo-repo/issues/0999');
  await expect(page.getByRole('heading', { name: 'No issue #0999' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to the board' }).click();
  await expect(page).toHaveURL(/\/w\/demo-repo\/inbox$/);
});

test('send an issue to the backlog with its status, and promote it back', async ({ page }) => {
  const original = await readIssueFile('0007-fix-the-readme-typo.md');
  try {
    await page.goto('/w/demo-repo/inbox');
    await page.locator('.feed-row', { hasText: 'Fix the README typo' }).click();
    await page.locator('[data-issue-id="0007"] .card').click();
    const panel = page.getByRole('dialog', { name: 'Issue detail' });
    await panel.getByRole('button', { name: 'Status: Todo' }).click();
    await page.getByRole('menu', { name: 'Status' }).getByRole('menuitemcheckbox', { name: 'Backlog' }).click();
    await expect.poll(() => readIssueFile('0007-fix-the-readme-typo.md')).toContain('status: backlog');
    await expect(page.locator('.col-todo [data-issue-id="0007"]')).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Backlog 1' }).click();
    const row = page.locator('.backlog-row', { hasText: 'Fix the README typo' });
    await row.getByRole('button', { name: 'Promote to Todo' }).click();
    await expect.poll(() => readIssueFile('0007-fix-the-readme-typo.md')).toBe(original);
    await page.keyboard.press('Escape');
    await expect(page.locator('.col-todo [data-issue-id="0007"]')).toBeVisible();
  } finally {
    await writeIssueFile('0007-fix-the-readme-typo.md', original);
  }
});

test('open an issue in my editor once one is chosen in Settings', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
  await page.locator('.feed-row', { hasText: 'Check the new layout by hand' }).click();
  await page.locator('[data-issue-id="0003"] .card').click();
  const drawer = page.getByRole('dialog', { name: 'Issue detail' });
  await expect(drawer.getByRole('link', { name: /Open in/ })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await settings.getByRole('radio', { name: 'Cursor' }).click();
  await settings.getByRole('button', { name: 'Done' }).click();
  await page.locator('[data-issue-id="0003"] .card').click();
  await expect(drawer.getByRole('link', { name: 'Open in Cursor' })).toHaveAttribute(
    'href',
    /^cursor:\/\/file\/.+\/demo-repo\/\.agents\/issues\/0003-check-the-new-layout\.md$/,
  );
});
