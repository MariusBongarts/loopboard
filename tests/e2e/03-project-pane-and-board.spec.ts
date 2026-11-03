import { expect, test } from '@playwright/test';
import { readIssueFile, writeIssueFile } from './workspace';

// Spec § 3 — Project pane and board.
test('blocking relations and sub-issues', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
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
    await page.goto('/w/demo-repo/inbox');
    await page.locator('.feed-row', { hasText: 'Wire the export button' }).click();
    const card = page.locator('.col-todo [data-issue-id="0001"]');
    await expect(card.locator('.marker-waiting')).toHaveCount(0);
    await card.locator('.card').click();
    await expect(page.getByRole('region', { name: 'Relations' })).toContainText(/After.*#0004 Add the API route/);
  } finally {
    await writeIssueFile('0001-wire-the-export-button.md', original);
  }
});

test('see every issue on one board', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
  await page.locator('.rail-nav', { hasText: 'Board' }).click();
  await expect(page).toHaveURL(/\/w\/demo-repo\/board$/);
  await expect(page.locator('.rail-nav.on')).toContainText('Board');

  const board = page.locator('.board-view');
  await expect(page.getByRole('button', { name: 'Board scope: All issues' })).toBeVisible();
  // A project's issue and one without a project, on the same board.
  await expect(board.locator('.col-todo [data-issue-id="0001"]')).toBeVisible();
  await expect(board.locator('.col-todo [data-issue-id="0007"]')).toBeVisible();
  await expect(board.locator('.col-todo [data-issue-id="0001"] .project-badge')).toHaveText('Demo Project');
  // No backlog ideas and no archived issues; no Board / List choice.
  await expect(board.locator('[data-issue-id="0006"]')).toHaveCount(0);
  await expect(board.locator('[data-issue-id="0008"]')).toHaveCount(0);
  await expect(board.getByRole('radio', { name: 'List' })).toHaveCount(0);
  await expect(board.locator('.board-count')).toHaveText(await page.locator('.rail-nav', { hasText: 'Board' }).locator('.rail-count').innerText());

  await board.locator('.col-todo [data-issue-id="0001"] .card').click();
  await expect(page.getByRole('dialog', { name: 'Issue detail' }).locator('.issue-view-title')).toHaveText('Wire the export button');
});

test('narrow the board to a project, no project or the backlog', async ({ page }) => {
  await page.goto('/w/demo-repo/board');
  const board = page.locator('.board-view');
  const pick = async (from: string, name: string) => {
    await page.getByRole('button', { name: `Board scope: ${from}` }).click();
    await page.getByRole('menu', { name: 'Board scope' }).getByRole('menuitemcheckbox', { name }).click();
  };

  await pick('All issues', 'Demo Project');
  await expect(page).toHaveURL(/\?scope=01-demo-project$/);
  await expect(board.locator('.col-todo [data-issue-id="0001"]')).toBeVisible();
  await expect(board.locator('.col-todo [data-issue-id="0007"]')).toHaveCount(0);
  // The same board as the project's pane: archived issues end Done.
  await expect(board.locator('.col-done [data-issue-id="0008"]')).toBeVisible();
  await expect(board.locator('.col-todo [data-issue-id="0001"] .project-badge')).toHaveCount(0);

  await pick('Demo Project', 'No project');
  await expect(page).toHaveURL(/\?scope=none$/);
  await expect(board.locator('.col-todo [data-issue-id="0007"]')).toBeVisible();
  await expect(board.locator('.col-todo [data-issue-id="0001"]')).toHaveCount(0);

  await pick('No project', 'Backlog');
  await expect(page).toHaveURL(/\?scope=backlog$/);
  await expect(board.locator('.col-backlog [data-issue-id="0006"]')).toBeVisible();
  await expect(board.locator('.col-todo .card')).toHaveCount(0);
  await expect(board.locator('.pane-backlog')).toHaveCount(0);

  // Back returns to the previous scope; the rail's Board clears it.
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Board scope: No project' })).toBeVisible();
  await page.locator('.rail-nav', { hasText: 'Board' }).click();
  await expect(page).toHaveURL(/\/board$/);
  await expect(page.getByRole('button', { name: 'Board scope: All issues' })).toBeVisible();

  // Filters don't survive a change of scope; a link to a gone project shows everything.
  await board.getByRole('searchbox', { name: 'Filter this board' }).fill('export');
  await expect(board.locator('.card')).toHaveCount(1);
  await pick('All issues', 'Demo Project');
  await expect(board.getByRole('searchbox', { name: 'Filter this board' })).toHaveValue('');
  await page.goto('/w/demo-repo/board?scope=99-gone');
  await expect(page.getByRole('button', { name: 'Board scope: All issues' })).toBeVisible();
});

test('a new issue defaults to the project the board is narrowed to', async ({ page }) => {
  await page.goto('/w/demo-repo/board?scope=01-demo-project');
  await expect(page.locator('.board-view .card').first()).toBeVisible();
  await page.keyboard.press('c');
  const dialog = page.getByRole('dialog', { name: 'New issue' });
  await expect(dialog.getByRole('combobox', { name: 'Project' })).toHaveValue('01-demo-project');
  await page.keyboard.press('Escape');
});

test('drop an idea from the backlog board to schedule it', async ({ page }) => {
  const original = await readIssueFile('0006-someday-dark-mode.md');
  try {
    await page.goto('/w/demo-repo/board?scope=backlog');
    const board = page.locator('.board-view');
    await board.locator('.col-backlog [data-issue-id="0006"]').dragTo(board.locator('.col-todo .column-list'), { targetPosition: { x: 20, y: 20 } });
    await expect.poll(() => readIssueFile('0006-someday-dark-mode.md')).toBe(original.replace('status: backlog', 'status: todo'));
    await expect(board.locator('.col-backlog [data-issue-id="0006"]')).toHaveCount(0);
  } finally {
    await writeIssueFile('0006-someday-dark-mode.md', original);
  }
});

test("see every project's progress", async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
  await page.locator('.rail-nav', { hasText: 'Projects' }).first().click();
  await expect(page).toHaveURL(/\/w\/demo-repo\/projects$/);
  const row = page.locator('.project-row', { hasText: 'Demo Project' });
  // #0006 is a backlog idea, so it doesn't count.
  await expect(row.locator('.project-row-pct')).toHaveText('2/6');
  await expect(row.locator('.project-row-you')).toHaveText('2 need you');
  await expect(row.locator('.project-phase-name')).toHaveText(['Phase 1 — Export']);

  await row.click();
  await expect(page).toHaveURL(/\/w\/demo-repo\/inbox$/);
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
  await expect(page).toHaveURL(/\/w\/demo-repo\/inbox$/);
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
  await page.goto('/w/demo-repo/inbox');
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
  await page.goto('/w/demo-repo/inbox');
  const board = page.locator('.pane-board');
  await expect(board).toHaveClass(/\bmore-right\b/);
  await expect(board).not.toHaveClass(/\bmore-left\b/);
  await board.evaluate((el) => (el.scrollLeft = el.scrollWidth));
  await expect(board).toHaveClass(/\bmore-left\b/);
  await expect(board).not.toHaveClass(/\bmore-right\b/);
});

test('the pane follows the selection; a feed row can open another board', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
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
  await page.goto('/w/demo-repo/inbox');
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
  await page.goto('/w/demo-repo/inbox');
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
