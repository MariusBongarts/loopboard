import { expect, test } from '@playwright/test';
import { readIssueFile, writeIssueFile } from './workspace';

// Spec § 3 — Project pane and board.
test('blocking relations and sub-issues', async ({ page }) => {
  await page.goto('/w/demo-repo');
  await page.locator('.feed-row', { hasText: 'Wire the export button' }).click();
  const card = page.locator('.col-todo [data-issue-id="0001"]');
  await expect(card.locator('.marker-waiting')).toHaveText('waiting on #0002');

  await card.locator('.card').click();
  const drawer = page.getByRole('dialog', { name: 'Issue detail' });
  const relations = drawer.getByRole('region', { name: 'Relations' });
  await expect(relations).toContainText('Blocked by');
  await relations.getByRole('button', { name: /#0002 Cache the feed/ }).click();
  await expect(drawer.locator('.issue-view-title')).toHaveText('Cache the feed');
  await expect(drawer.getByRole('region', { name: 'Relations' })).toContainText('Blocks · 0/1 done');

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Hide waiting 1' }).click();
  await expect(page.locator('.col-todo [data-issue-id="0001"]')).toHaveCount(0);
});

test('a finished parent reads "After", not "Blocked by"', async ({ page }) => {
  const original = await readIssueFile('0001-wire-the-export-button.md');
  try {
    await writeIssueFile('0001-wire-the-export-button.md', original.replace('parent: 0002', 'parent: 0004'));
    await page.goto('/w/demo-repo');
    await page.locator('.feed-row', { hasText: 'Wire the export button' }).click();
    const card = page.locator('.col-todo [data-issue-id="0001"]');
    await expect(card.locator('.marker-waiting')).toHaveCount(0);
    await card.locator('.card').click();
    await expect(page.getByRole('region', { name: 'Relations' })).toContainText(/After.*#0004 Add the API route/);
  } finally {
    await writeIssueFile('0001-wire-the-export-button.md', original);
  }
});

test("see every project's progress", async ({ page }) => {
  await page.goto('/w/demo-repo');
  await page.locator('.rail-nav', { hasText: 'Projects' }).first().click();
  await expect(page).toHaveURL(/\/w\/demo-repo\/projects$/);
  const row = page.locator('.project-row', { hasText: 'Demo Project' });
  // #0006 is a backlog idea, so it doesn't count.
  await expect(row.locator('.project-row-pct')).toHaveText('2/6');
  await expect(row.locator('.project-row-you')).toHaveText('2 need you');
  await expect(row.locator('.project-phase-name')).toHaveText(['Phase 1 — Export']);

  await row.click();
  await expect(page).toHaveURL(/\/w\/demo-repo$/);
  await expect(page.locator('.pane-title')).toHaveText('Demo Project');
});

test('filter and sort the projects', async ({ page }) => {
  await page.goto('/w/demo-repo/projects');
  const filter = page.getByRole('searchbox', { name: 'Filter projects' });
  await filter.fill('nothing like it');
  await expect(page.locator('.project-row')).toHaveCount(0);
  await expect(page.locator('.projects-scroll')).toContainText('No projects match “nothing like it”.');
  await expect(page.locator('.projects-count')).toHaveText('0');

  await filter.fill('demo');
  await expect(page).toHaveURL(/\/projects\?q=demo$/);
  await page.locator('.project-row', { hasText: 'Demo Project' }).click();
  await expect(page).toHaveURL(/\/w\/demo-repo$/);
  await page.goBack();
  await expect(filter).toHaveValue('demo');
  await expect(page.locator('.project-row')).toHaveCount(1);

  const sort = page.getByRole('button', { name: 'Sort projects' });
  await expect(sort).toHaveText('Last active');
  await sort.click();
  await page.locator('.menu-item', { hasText: 'Progress' }).click();
  await expect(sort).toHaveText('Progress');
  await page.goto('/w/demo-repo/projects');
  await expect(sort).toHaveText('Progress');
});

test('empty columns shrink, and the feed can make room for the board', async ({ page }) => {
  await page.goto('/w/demo-repo');
  await page.locator('.pane-board-tools').getByRole('radio', { name: 'Agent' }).click();
  const blocked = page.getByRole('region', { name: 'Blocked' });
  await expect(blocked).toHaveClass(/column-empty/);
  expect((await blocked.boundingBox())!.width).toBeLessThan(60);

  const board = page.locator('.pane-board');
  const before = (await board.boundingBox())!.width;
  await page.getByRole('button', { name: 'Hide feed' }).click();
  await expect(page.locator('.inbox-list')).toBeHidden();
  expect((await board.boundingBox())!.width).toBeGreaterThan(before + 300);
  await page.reload();
  await expect(page.locator('.inbox-list')).toBeHidden();
  await page.getByRole('button', { name: 'Show feed' }).click();
  await expect(page.locator('.inbox-list')).toBeVisible();
});

test('columns out of view are hinted', async ({ page }) => {
  await page.goto('/w/demo-repo');
  const board = page.locator('.pane-board');
  await expect(board).toHaveClass(/\bmore-right\b/);
  await expect(board).not.toHaveClass(/\bmore-left\b/);
  await board.evaluate((el) => (el.scrollLeft = el.scrollWidth));
  await expect(board).toHaveClass(/\bmore-left\b/);
  await expect(board).not.toHaveClass(/\bmore-right\b/);
});

test('the pane follows the selection; a feed row can open another board', async ({ page }) => {
  await page.goto('/w/demo-repo');
  await page.locator('.feed-row', { hasText: 'Fix the README typo' }).click();
  await expect(page.locator('.pane-title')).toHaveText('Standalone issues');
  await page.locator('.feed-row', { hasText: 'Wire the export button' }).click();
  await expect(page.locator('.pane-title')).toHaveText('Demo Project');
  await expect(page.locator('[data-issue-id="0001"] .card')).toHaveClass(/\bhl\b/);

  await page.locator('.feed-row', { hasText: 'Fix the README typo' }).locator('.feed-proj').click();
  await expect(page.locator('.pane-title')).toHaveText('Standalone issues');
  await expect(page.locator('.feed-row.on')).toContainText('Wire the export button');
});

test('the board: five columns, archived issues last in Done, filters', async ({ page }) => {
  await page.goto('/w/demo-repo');
  await page.locator('.feed-row', { hasText: 'Wire the export button' }).click();
  await expect(page.locator('.pane-board .column-name')).toHaveText(['Todo', 'Blocked', 'In progress', 'In review', 'Done']);
  await expect(page.getByRole('tab', { name: /Board\s*6/ })).toBeVisible();
  const done = page.locator('.col-done [data-issue-id]');
  await expect(done).toHaveCount(2);
  await expect(done.nth(1)).toHaveAttribute('data-issue-id', '0008');
  await expect(done.nth(1)).toHaveAttribute('data-archived', 'true');

  await page.locator('.pane-board-tools').getByRole('radio', { name: /You/ }).click();
  await expect(page.locator('.pane-board [data-issue-id]')).toHaveCount(2);
  await page.locator('.pane-board-tools').getByRole('radio', { name: 'Everyone' }).click();
  await page.getByLabel('Filter this board').fill('vendor');
  await expect(page.locator('.pane-board [data-issue-id]')).toHaveCount(1);
});

test('current focus, the selected item, and the PRD, WIP and activity tabs', async ({ page }) => {
  await page.goto('/w/demo-repo');
  await page.locator('.feed-row', { hasText: 'Wire the export button' }).click();
  const titleRow = page.locator('.pane-title-row');
  const focus = page.getByRole('dialog', { name: 'Current focus' });
  await titleRow.getByRole('button', { name: 'Current focus' }).click();
  await expect(focus).toContainText('Phase 1 — the export button. #0001 is next.');
  await page.keyboard.press('Escape');
  await expect(focus).toBeHidden();

  const selected = page.getByRole('dialog', { name: 'Selected issue · #0001' });
  await titleRow.getByRole('button', { name: 'Selected issue · #0001' }).click();
  await expect(selected).toContainText('Wire the export button');
  await page.locator('.pane-title').click();
  await expect(selected).toBeHidden();

  await titleRow.getByRole('button', { name: 'Current focus' }).click();
  await focus.locator('.issue-ref', { hasText: '#0001' }).click();
  await expect(focus).toBeHidden();
  await expect(page.locator('.issue-panel')).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('tab', { name: 'PRD' }).click();
  await expect(page.locator('.pane-doc')).toContainText('Fixture users cannot export their data.');
  await page.getByRole('tab', { name: 'WIP' }).click();
  await page.locator('.pane-doc a', { hasText: '#0001' }).first().click();
  await expect(page.locator('.issue-view-title')).toHaveText('Wire the export button');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /Activity/ }).click();
  await expect(page.locator('.pane-log-date')).toHaveText(['2026-09-14', '2026-09-10']);
});
