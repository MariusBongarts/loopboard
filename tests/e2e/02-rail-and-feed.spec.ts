import { expect, test, type Page } from '@playwright/test';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readIssueFile, workspaceRoot, writeIssueFile } from './workspace';

// Spec § 2 — Rail and feed.
test('the feed lists sessions and issues by day', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');

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
  await page.goto('/w/demo-repo/inbox');
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

test('see which files the board skipped', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/w/demo-repo/inbox');
  await expect(page.locator('.live-dot.live')).toBeVisible();
  const rail = page.getByRole('navigation', { name: 'Inbox navigation' });
  // The fixture's 0009 has invalid YAML.
  await expect(rail.getByRole('button', { name: '1 file skipped' })).toBeVisible();

  const issues = join(workspaceRoot(), 'issues');
  const folder = join(workspaceRoot(), 'projects', 'Offline-Mode');
  try {
    // An agent files an issue and a project under names the board can't use,
    // and one file can't be read (a folder stands in for it on every OS).
    await writeFile(join(issues, '0011-Tax-Return.md'), '---\nid: 0011\ntitle: Tax return\nstatus: todo\ncreated: 2026-09-15\n---\n\nBody.\n');
    await mkdir(join(issues, '0012-offline.md'));
    await mkdir(folder);
    await writeFile(join(folder, 'wip.md'), '# Offline mode — WIP\n');
    await rail.getByRole('button', { name: '4 files skipped' }).click();

    const dialog = page.getByRole('dialog', { name: 'Skipped files' });
    await expect(dialog.locator('.skipped-file')).toHaveText([
      '.agents/issues/0009-broken-frontmatter.md',
      '.agents/issues/0011-Tax-Return.md',
      '.agents/issues/0012-offline.md',
      '.agents/projects/Offline-Mode',
    ]);
    await expect(dialog.locator('.skipped-reason')).toHaveText([/^invalid frontmatter: /, /NNNN-slug\.md/, /^can't be read/, /NN-slug/]);
    await dialog.getByRole('button', { name: 'Copy agent prompt' }).click();
    const prompt = await page.evaluate(() => navigator.clipboard.readText());
    expect(prompt).toContain('- ".agents/issues/0011-Tax-Return.md" — name must be NNNN-slug.md');
    expect(prompt).toContain('`npx loopboard check`');

    // The agent fixes them; the list and the feed follow without a reload.
    await rename(join(issues, '0011-Tax-Return.md'), join(issues, '0011-tax-return.md'));
    await rm(join(issues, '0012-offline.md'), { recursive: true });
    await rm(folder, { recursive: true });
    await expect(dialog.locator('.skipped-file')).toHaveText(['.agents/issues/0009-broken-frontmatter.md']);
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(rail.getByRole('button', { name: '1 file skipped' })).toBeVisible();
    await expect(page.locator('.feed-title', { hasText: 'Tax return' })).toBeVisible();

    // Collapsed, the notice is an icon with the count as its tooltip; ⌘K opens the same list.
    await page.keyboard.press('[');
    await expect(rail.locator('.rail-skipped')).toHaveAttribute('title', '1 file skipped');
    await expect(rail.locator('.rail-skipped .rail-name')).toBeHidden();
    await page.keyboard.press('ControlOrMeta+k');
    await page.getByRole('combobox').fill('skipped');
    await page.keyboard.press('Enter');
    await expect(dialog.locator('.skipped-file')).toHaveText(['.agents/issues/0009-broken-frontmatter.md']);
  } finally {
    await rm(join(issues, '0011-Tax-Return.md'), { force: true });
    await rm(join(issues, '0011-tax-return.md'), { force: true });
    await rm(join(issues, '0012-offline.md'), { recursive: true, force: true });
    await rm(folder, { recursive: true, force: true });
  }
});

// Swaps the event stream for one the test drives: a watcher failure can't be
// provoked from the browser (#0072). Nothing arrives unless the test sends it.
async function driveStream(page: Page): Promise<(event: 'ready' | 'stale' | 'error') => Promise<void>> {
  await page.addInitScript(() => {
    class Stream extends EventTarget {
      onerror: (() => void) | null = null;
      constructor() {
        super();
        Object.assign(window, { loopboardStream: this });
      }
      close() {}
    }
    Object.assign(window, { EventSource: Stream });
  });
  return (event) =>
    page.evaluate((name) => {
      const stream: EventTarget & { onerror: (() => void) | null } = Reflect.get(window, 'loopboardStream');
      if (name === 'error') stream.onerror?.();
      else stream.dispatchEvent(new Event(name));
    }, event);
}

test('the board says when it stops being live', async ({ page }) => {
  const send = await driveStream(page);
  await page.goto('/w/demo-repo/inbox');
  const rail = page.getByRole('navigation', { name: 'Inbox navigation' });
  await expect(page.locator('.feed-row').first()).toBeVisible();
  await send('ready');
  await expect(page.locator('.live-dot.live')).toBeVisible();

  // The server lost its watcher: the board says so and refetches.
  let refetch = page.waitForRequest('**/api/w/demo-repo/data');
  await send('stale');
  await refetch;
  await expect(rail.getByRole('button', { name: /^Not live/ })).toHaveText('Not live');
  await expect(page.locator('.live-dot')).toHaveCount(0);

  // The watcher is back: catch up, live again.
  refetch = page.waitForRequest('**/api/w/demo-repo/data');
  await send('ready');
  await refetch;
  await expect(page.locator('.live-dot.live')).toBeVisible();

  // Same for a dropped connection.
  await send('error');
  await expect(rail.getByRole('button', { name: /^Lost the connection/ })).toHaveText('Offline');
  refetch = page.waitForRequest('**/api/w/demo-repo/data');
  await send('ready');
  await refetch;
  await expect(page.locator('.live-dot.live')).toBeVisible();
});

test('refresh on demand', async ({ page }) => {
  // No events arrive, so only a refresh can show what changed on disk.
  const send = await driveStream(page);
  await page.goto('/w/demo-repo/inbox');
  const rail = page.getByRole('navigation', { name: 'Inbox navigation' });
  await page.locator('.feed-row', { hasText: 'Cache the feed' }).click();
  await expect(page.locator('.col-in-progress [data-issue-id="0002"]')).toBeVisible();
  await send('ready');

  const original = await readIssueFile('0002-cache-the-feed.md');
  try {
    await writeIssueFile('0002-cache-the-feed.md', original.replace('status: in-progress', 'status: in-review'));
    await rail.getByRole('button', { name: /^Live — updates as files change/ }).click();
    await expect(page.locator('.col-in-review [data-issue-id="0002"]')).toBeVisible();
    await expect(page.locator('.toast')).toContainText('Refreshed');

    // Not live any more; the refetch that comes with it is done before the next edit.
    const settled = page.waitForResponse('**/api/w/demo-repo/data');
    await send('stale');
    await settled;
    await writeIssueFile('0002-cache-the-feed.md', original);
    await page.keyboard.press('ControlOrMeta+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await palette.getByRole('combobox').fill('refresh');
    await expect(palette.getByRole('option').first()).toHaveText(/Refresh/);
    await palette.getByRole('combobox').press('Enter');
    await expect(page.locator('.col-in-progress [data-issue-id="0002"]')).toBeVisible();

    // The badge refreshes too.
    await writeIssueFile('0002-cache-the-feed.md', original.replace('status: in-progress', 'status: in-review'));
    await rail.getByRole('button', { name: /^Not live/ }).click();
    await expect(page.locator('.col-in-review [data-issue-id="0002"]')).toBeVisible();
  } finally {
    await writeIssueFile('0002-cache-the-feed.md', original);
  }
});

test('filter the feed from the rail', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
  const rail = page.getByRole('navigation', { name: 'Inbox navigation' });
  const rows = page.locator('.feed-row');
  await expect(rows).toHaveCount(9);
  await expect(page.locator('.fchip')).toHaveCount(0);
  await rail.getByRole('button', { name: /^Needs you/ }).click();
  await expect(rows).toHaveCount(2);
  await rail.getByRole('button', { name: /^Sessions/ }).click();
  await expect(rows).toHaveCount(2);
  await expect(page.locator('.feed-kind')).toHaveText(['Session', 'Session']);
  await rail.getByRole('button', { name: /^Issues/ }).click();
  await expect(rows).toHaveCount(7);
  await expect(page.locator('.list-head h2')).toHaveText('Issues');
  await rail.getByRole('button', { name: /^Inbox/ }).click();
  await expect(rows).toHaveCount(9);
});

test('collapse the rail to icons, and back', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
  const rail = page.getByRole('navigation', { name: 'Inbox navigation' });
  await rail.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(rail).toHaveClass(/collapsed/);
  expect((await rail.boundingBox())!.width).toBeLessThan(60);
  await rail.getByRole('button', { name: /^Sessions/ }).click();
  await expect(page.locator('.feed-row')).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Inbox navigation' })).toHaveClass(/collapsed/);
  await page.keyboard.press('[');
  await expect(page.getByRole('navigation', { name: 'Inbox navigation' })).not.toHaveClass(/collapsed/);
  expect((await page.getByRole('navigation', { name: 'Inbox navigation' }).boundingBox())!.width).toBeGreaterThan(200);
});

test('search narrows the feed and the project list', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
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
  await page.goto('/w/demo-repo/inbox');
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
  await page.goto('/w/demo-repo/inbox');
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

test('resize the rail and the feed', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
  const rail = page.locator('.inbox-rail');
  const handle = page.getByRole('separator', { name: 'Resize sidebar' });
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 200, { steps: 5 });
  await page.mouse.up();
  expect(Math.round((await rail.boundingBox())!.width)).toBeGreaterThan(300);
  await page.reload();
  expect(Math.round((await page.locator('.inbox-rail').boundingBox())!.width)).toBeGreaterThan(300);
  await page.getByRole('separator', { name: 'Resize sidebar' }).dblclick();
  await expect.poll(async () => Math.round((await page.locator('.inbox-rail').boundingBox())!.width)).toBe(248);

  const feed = page.locator('.inbox-list');
  const feedHandle = page.getByRole('separator', { name: 'Resize feed' });
  await expect(feedHandle).toHaveAttribute('aria-valuenow', '380');
  await feedHandle.focus();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(feedHandle).toHaveAttribute('aria-valuenow', '444');
  expect(Math.round((await feed.boundingBox())!.width)).toBe(444);
  await page.reload();
  await expect(page.getByRole('separator', { name: 'Resize feed' })).toHaveAttribute('aria-valuenow', '444');
  await page.getByRole('separator', { name: 'Resize feed' }).dblclick();
  await expect(page.getByRole('separator', { name: 'Resize feed' })).toHaveAttribute('aria-valuenow', '380');
});
