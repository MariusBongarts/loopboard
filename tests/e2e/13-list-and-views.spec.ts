import { expect, test } from '@playwright/test';

// Spec § 13 — List and saved views.
test('browse, filter and move through every issue as a list', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
  await page.locator('.rail-nav', { hasText: 'All issues' }).click();
  await expect(page).toHaveURL(/\/w\/demo-repo\/issues$/);
  await expect(page.locator('.issue-group-head')).toHaveText([/Backlog\s*1/, /Todo\s*2/, /Blocked\s*1/, /In progress\s*1/, /In review\s*1/, /Done\s*1/]);

  await page.getByRole('radio', { name: 'You' }).click();
  await expect(page).toHaveURL(/who=human/);
  await expect(page.locator('.issue-row')).toHaveCount(2);
  await page.getByRole('radio', { name: 'Project' }).click();
  await expect(page.locator('.issue-group-head')).toHaveText([/Demo Project\s*2/]);
  await page.reload();
  await expect(page.locator('.issue-row')).toHaveCount(2);

  await page.keyboard.press('j');
  await expect(page.locator('.issue-row.on')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Issue detail' })).toBeVisible();
});

test('save, open, update and delete a view', async ({ page }) => {
  await page.goto('/w/demo-repo/issues?status=in-review');
  await expect(page.locator('.issue-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Save view' }).click();
  await page.getByLabel('View name').fill('Waiting for review');
  await page.getByLabel('View name').press('Enter');

  const railView = page.locator('.rail-nav', { hasText: 'Waiting for review' });
  await expect(railView).toBeVisible();
  await expect(page.locator('.list-view-head h2')).toHaveText('Waiting for review');

  await page.goto('/w/demo-repo/inbox');
  await railView.click();
  await expect(page).toHaveURL(/status=in-review.*view=/);
  await expect(page.locator('.issue-row')).toHaveCount(1);

  await page.getByRole('button', { name: 'Filter by status' }).click();
  await page.getByRole('menu', { name: 'Filter by status' }).getByRole('menuitemcheckbox', { name: 'Blocked' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Rename / update' }).click();
  await page.getByLabel('View name').fill('Stuck');
  await page.getByLabel('View name').press('Enter');
  await expect(page.locator('.rail-nav', { hasText: 'Stuck' })).toBeVisible();
  await page.goto('/w/demo-repo/inbox');
  await page.locator('.rail-nav', { hasText: 'Stuck' }).click();
  await expect(page.locator('.issue-row')).toHaveCount(2);

  await page.getByRole('button', { name: 'Delete view' }).click();
  await expect(page.locator('.rail-nav', { hasText: 'Stuck' })).toHaveCount(0);
});

test('switch a project between board and list', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
  await page.locator('.pane-board-tools').getByRole('radio', { name: 'List' }).click();
  await expect(page.locator('.pane-body .issue-group-head').first()).toHaveText(/Backlog\s*1/);
  await page.reload();
  await expect(page.locator('.pane-body .issue-row')).toHaveCount(6);
  await page.locator('.pane-board-tools').getByRole('radio', { name: 'Board' }).click();
});

test('filter by status and label from menus, then clear', async ({ page }) => {
  await page.goto('/w/demo-repo/issues');
  await page.getByRole('button', { name: 'Filter by label' }).click();
  await page.keyboard.type('ui');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/label=ui/);
  await expect(page.locator('.issue-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Filter by status' }).click();
  await page.getByRole('menu', { name: 'Filter by status' }).getByRole('menuitemcheckbox', { name: 'Todo' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.issue-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page).toHaveURL(/\/issues$/);
  await expect(page.locator('.issue-row')).toHaveCount(7);
});
