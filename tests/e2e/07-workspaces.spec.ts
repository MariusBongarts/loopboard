import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { e2eRoot } from './workspace';

// Spec § 7 — Workspaces.
async function openMenu(page: Page) {
  await page.locator('.ws-current').click();
  await expect(page.getByRole('menu', { name: 'Workspaces' })).toBeVisible();
}

async function freshRepo(name: string): Promise<string> {
  const path = join(e2eRoot(), name);
  await mkdir(join(path, '.agents', 'issues'), { recursive: true });
  await writeFile(
    join(path, '.agents', 'issues', '0001-fresh-start.md'),
    '---\nid: 0001\ntitle: Fresh start\nstatus: todo\nassignee: agent\nlabels: []\ncreated: 2026-09-20\n---\n\nBody.\n',
  );
  return path;
}

test('open the last-used workspace', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/w\/demo-repo$/);
  await expect(page).toHaveTitle('demo-repo · loopboard');

  await page.goto('/w/legacy-repo');
  await expect(page.locator('.feed-title')).toHaveText(['Started.', 'Legacy task in an ai/ root']);
});

test('switch workspace from the top-left, and a legacy ai/ root works', async ({ page }) => {
  await page.goto('/w/demo-repo');
  await openMenu(page);
  const items = page.getByRole('menuitemradio');
  await expect(items).toHaveText([/demo-repo\s*8/, /legacy-repo\s*1/]);
  await expect(items.first()).toHaveAttribute('aria-checked', 'true');

  await items.nth(1).click();
  await expect(page).toHaveURL(/\/w\/legacy-repo$/);
  await expect(page.locator('.ws-current')).toContainText('legacy-repo');
  await page.locator('.card').first().click();
  await expect(page.getByRole('dialog', { name: 'Issue detail' }).getByRole('button', { name: 'Copy path' })).toHaveAttribute('title', 'ai/issues/0001-legacy-task.md');
});

test('add a workspace by path, and explain a folder without a root', async ({ page }) => {
  await freshRepo('fresh-repo');
  await mkdir(join(e2eRoot(), 'plain-folder'), { recursive: true });
  await page.goto('/w/demo-repo');
  await openMenu(page);
  await page.getByRole('menuitem', { name: '+ Add workspace…' }).click();

  const input = page.getByLabel('Repo path');
  await expect(input).toHaveValue('~/');
  await input.fill(join(e2eRoot(), 'pla'));
  await input.press('Enter');
  await expect(page.getByRole('alert')).toContainText('Run `loopboard init` there first');

  await input.fill(join(e2eRoot(), 'fre'));
  const option = page.getByRole('option', { name: /fresh-repo\// });
  await expect(option).toContainText('has .agents');
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(input).toHaveValue(`${join(e2eRoot(), 'fresh-repo')}/`);
  await input.press('Enter');

  await expect(page).toHaveURL(/\/w\/fresh-repo$/);
  await expect(page.locator('.feed-title')).toHaveText(['Fresh start']);
});

test('rename and remove workspaces; a missing folder is flagged', async ({ page }) => {
  const gone = await freshRepo('gone-repo');
  await page.goto('/w/demo-repo');
  const added = await page.request.post('/api/workspaces', { data: { path: gone } });
  expect(added.status()).toBe(201);
  await rm(gone, { recursive: true });

  await openMenu(page);
  await expect(page.getByRole('menuitemradio', { name: /gone-repo/ })).toContainText('folder missing');
  await page.getByRole('menuitem', { name: 'Manage workspaces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Manage workspaces' });
  const row = dialog.locator('li', { hasText: 'fresh-repo' });
  await row.getByRole('button', { name: 'Rename' }).click();
  await dialog.getByLabel('Workspace name').fill('Fresh');
  await dialog.getByLabel('Workspace name').press('Enter');
  await expect(dialog.locator('li', { hasText: 'Fresh' })).toBeVisible();

  for (const name of ['Fresh', 'gone-repo']) {
    const li = dialog.locator('li', { hasText: name });
    await li.getByRole('button', { name: 'Remove…' }).click();
    await li.getByRole('button', { name: 'Remove', exact: true }).click();
  }
  await expect(dialog.locator('li')).toHaveCount(2);
  expect(await readFile(join(e2eRoot(), 'fresh-repo', '.agents', 'issues', '0001-fresh-start.md'), 'utf8')).toContain(
    'Fresh start',
  );
});

test('see what needs me across all workspaces', async ({ page }) => {
  await page.goto('/w/demo-repo');
  await openMenu(page);
  await page.getByRole('menuitem', { name: 'All workspaces · Needs you' }).click();
  await expect(page).toHaveURL(/\/needs-you\?from=demo-repo$/);
  await expect(page.locator('.needs h1')).toHaveText(/Needs you\s*3/);
  await expect(page.locator('.needs-group h2')).toHaveText([/demo-repo\s*2/, /legacy-repo\s*1/]);

  await page.locator('.needs-row', { hasText: 'Legacy task in an ai/ root' }).click();
  await expect(page).toHaveURL(/\/w\/legacy-repo\?item=i:0001$/);
  await expect(page.locator('.feed-row.on')).toContainText('Legacy task in an ai/ root');
});
