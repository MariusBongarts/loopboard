import { expect, test } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { readIssueFile, workspaceRoot, writeIssueFile } from './workspace';

// Spec § 2 — Rail and feed.
test('the feed lists sessions and issues by day', async ({ page }) => {
  await page.goto('/');

  const rows = page.locator('.feed-row');
  // 2 sessions + 7 live issues; the archived issue stays out of the feed.
  await expect(rows).toHaveCount(9);
  await expect(page.locator('.feed-day')).toHaveCount(6);

  const titles = await page.locator('.feed-title').allTextContents();
  // A session's first sentence is its headline.
  expect(titles[0]).toBe('Feed caching landed behind a flag;');
  expect(titles[1]).toBe('Wire the export button');
  expect(titles).not.toContain('Set up the repo');

  // On the same day, the session comes before the issue.
  const sameDay = page.locator('.feed-day').filter({ hasText: 'Kickoff' }).locator('.feed-kind');
  await expect(sameDay).toHaveText(['Session', '#0004', '#0005']);
});

test('the board follows file changes live', async ({ page }) => {
  await page.goto('/w/demo-repo');
  await expect(page.locator('.live-dot.live')).toBeVisible();
  await page.locator('.feed-row', { hasText: 'Cache the feed' }).click();
  await expect(page.locator('.col-in-progress [data-issue-id="0002"]')).toBeVisible();

  const original = await readIssueFile('0002-cache-the-feed.md');
  try {
    // An agent moves #0002 and files a new issue; nothing reloads the page.
    await writeIssueFile('0002-cache-the-feed.md', original.replace('status: in-progress', 'status: in-review'));
    await writeIssueFile(
      '0010-live-arrival.md',
      '---\nid: 0010\ntitle: Live arrival\nstatus: todo\nassignee: agent\nproject: 01-demo-project\nlabels: []\ncreated: 2026-09-15\n---\n\nBody.\n',
    );
    await expect(page.locator('.col-in-review [data-issue-id="0002"]')).toBeVisible();
    await expect(page.locator('.feed-title').first()).toHaveText('Live arrival');
    // The selected item survives the refresh.
    await expect(page.locator('.feed-row.on')).toContainText('Cache the feed');
  } finally {
    await writeIssueFile('0002-cache-the-feed.md', original);
    await rm(join(workspaceRoot(), 'issues', '0010-live-arrival.md'), { force: true });
  }
});

test('filter the feed with the rail and the chips', async ({ page }) => {
  await page.goto('/w/demo-repo');
  const rows = page.locator('.feed-row');
  await expect(rows).toHaveCount(9);
  await page.locator('.rail-nav', { hasText: 'Needs you' }).click();
  await expect(rows).toHaveCount(2);
  await page.locator('.fchip', { hasText: 'Sessions' }).click();
  await expect(rows).toHaveCount(2);
  await expect(page.locator('.feed-kind')).toHaveText(['Session', 'Session']);
  await page.locator('.fchip', { hasText: 'Issues' }).click();
  await expect(rows).toHaveCount(7);
  await page.locator('.rail-nav', { hasText: 'Inbox' }).click();
  await expect(rows).toHaveCount(9);
});

test('search narrows the feed and the project list', async ({ page }) => {
  await page.goto('/w/demo-repo');
  await expect(page.locator('.feed-row').first()).toBeVisible();
  await page.keyboard.press('/');
  const search = page.getByLabel('Search issues, sessions and PRDs');
  await expect(search).toBeFocused();
  await search.fill('vendor');
  await expect(page.locator('.feed-row')).toHaveText([/Wait for the vendor key/]);
  await expect(page.locator('.list-head h2')).toHaveText('Results for “vendor”');
  await search.fill('zzz-nothing');
  await expect(page.locator('.rail-row')).toHaveCount(0);
  await search.press('Escape');
  await expect(page.locator('.feed-row')).toHaveCount(9);
});

test('move through the feed with j and k, and the selection comes back', async ({ page }) => {
  await page.goto('/w/demo-repo');
  const rows = page.locator('.feed-row');
  await rows.nth(1).click();
  await page.keyboard.press('j');
  await expect(rows.nth(2)).toHaveClass(/\bon\b/);
  await page.keyboard.press('k');
  await expect(rows.nth(1)).toHaveClass(/\bon\b/);
  await rows.nth(4).click();
  await page.reload();
  await expect(page.locator('.feed-row').nth(4)).toHaveClass(/\bon\b/);
});

test('narrow the feed to one project, and pin it', async ({ page }) => {
  await page.goto('/w/demo-repo');
  const project = page.locator('.rail-row', { hasText: 'Demo Project' });
  await project.locator('.rail-nav').click();
  await expect(page.locator('.feed-row')).toHaveCount(8);
  await expect(page.locator('.list-head h2')).toHaveText('Demo Project');

  await project.hover();
  await project.getByRole('button', { name: 'Pin Demo Project' }).click();
  await expect(page.locator('.rail-sec', { hasText: 'Pinned' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.rail-sec', { hasText: 'Pinned' })).toBeVisible();
  await page.getByRole('button', { name: 'Unpin Demo Project' }).click();
  await expect(page.locator('.rail-sec', { hasText: 'Pinned' })).toHaveCount(0);
});

test('resize the rail', async ({ page }) => {
  await page.goto('/w/demo-repo');
  const rail = page.locator('.inbox-rail');
  const handle = page.getByRole('separator');
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 200, { steps: 5 });
  await page.mouse.up();
  expect(Math.round((await rail.boundingBox())!.width)).toBeGreaterThan(300);
  await page.reload();
  expect(Math.round((await page.locator('.inbox-rail').boundingBox())!.width)).toBeGreaterThan(300);
  await page.getByRole('separator').dblclick();
  await expect.poll(async () => Math.round((await page.locator('.inbox-rail').boundingBox())!.width)).toBe(248);
});
