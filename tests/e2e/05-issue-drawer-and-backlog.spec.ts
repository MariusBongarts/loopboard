import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { e2eRoot, readIssueFile, writeIssueFile } from './workspace';

// Spec § 5 — Issue drawer and backlog.
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

    await page.goto('/w/demo-repo');
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

test('tick a checklist item right in the drawer', async ({ page }) => {
  const file = '0002-cache-the-feed.md';
  const original = await readIssueFile(file);
  try {
    await page.goto('/w/demo-repo');
    await page.locator('.feed-row', { hasText: 'Cache the feed' }).click();
    await page.locator('[data-issue-id="0002"] .card').click();
    const box = page.locator('.drawer-body input[data-task-index="0"]');
    await box.click();
    await expect.poll(() => readIssueFile(file)).toBe(original.replace('- [ ] Cache hit', '- [x] Cache hit'));
    await expect(box).toBeChecked();
  } finally {
    await writeIssueFile(file, original);
  }
});

test('open an issue in the drawer, follow a reference, copy its path, close with Esc', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/w/demo-repo');
  await page.locator('.feed-row', { hasText: 'Check the new layout by hand' }).click();
  await page.locator('[data-issue-id="0003"] .card').click();
  const drawer = page.getByRole('dialog', { name: 'Issue detail' });
  await expect(drawer.locator('.drawer-head h2')).toHaveText('Check the new layout by hand');
  await expect(drawer.locator('.drawer-head')).toContainText('in-review');

  await drawer.locator('.drawer-path').click();
  await expect(drawer.getByText('Copied')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('.agents/issues/0003-check-the-new-layout.md');

  await expect(drawer.locator('.drawer-body')).toContainText('not #0099');
  await expect(drawer.locator('.drawer-body button.issue-ref[data-ref="0099"]')).toHaveCount(0);
  await drawer.locator('.drawer-body button.issue-ref[data-ref="0001"]').click();
  await expect(drawer.locator('.drawer-head h2')).toHaveText('Wire the export button');
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
});

test('send a todo issue to the backlog, and promote it back', async ({ page }) => {
  const original = await readIssueFile('0007-fix-the-readme-typo.md');
  try {
    await page.goto('/w/demo-repo');
    await page.locator('.feed-row', { hasText: 'Fix the README typo' }).click();
    await page.locator('[data-issue-id="0007"] .card').click();
    await page.getByRole('button', { name: 'Send to backlog' }).click();
    await expect(page.getByRole('dialog', { name: 'Issue detail' })).toHaveCount(0);
    await expect.poll(() => readIssueFile('0007-fix-the-readme-typo.md')).toContain('status: backlog');

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
