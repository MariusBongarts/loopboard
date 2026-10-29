import { expect, test } from '@playwright/test';
import { readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { readIssueFile, workspaceRoot, writeIssueFile } from './workspace';

// Spec § 11 — Capture and commands.
test('create an issue', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
  await page.locator('.feed-row', { hasText: 'Wire the export button' }).click();
  await page.keyboard.press('c');
  const dialog = page.getByRole('dialog', { name: 'New issue' });
  await expect(dialog.getByLabel('Title')).toBeFocused();
  await expect(dialog.getByLabel('Project')).toHaveValue('01-demo-project');
  await dialog.getByLabel('Title').fill('Wire the import: button');
  await dialog.getByRole('radio', { name: 'Bug' }).click();
  await dialog.getByLabel('Title').press('Enter');

  await expect(page.getByText('Created #0010')).toBeVisible();
  const drawer = page.getByRole('dialog', { name: 'Issue detail' });
  await expect(drawer.getByRole('heading', { name: 'Wire the import: button' })).toBeVisible();
  const file = await readIssueFile('0010-wire-the-import-button.md');
  try {
    expect(file).toContain('title: "Wire the import: button"\ncategory: bug\nstatus: todo\nassignee: agent\nproject: 01-demo-project\n');
    expect(file.split('---\n\n')[1]).toBe('## Steps to reproduce\n\n## Current\n\n## Expected\n\n## Acceptance criteria\n\n- [ ] \n');
    await expect(page.locator('.feed-row', { hasText: 'Wire the import: button' })).toBeVisible();
  } finally {
    await rm(join(workspaceRoot(), 'issues', '0010-wire-the-import-button.md'));
  }
});

test('create a project', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
  await page.getByRole('button', { name: 'New project' }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByLabel('Project title').fill('Import everything');
  await dialog.getByLabel('Project title').press('Enter');
  try {
    await expect(page.locator('.pane-title')).toHaveText('Import everything');
    await expect(page.getByRole('tab', { name: 'PRD' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.rail-row', { hasText: 'Import everything' })).toBeVisible();
    expect(await readdir(join(workspaceRoot(), 'projects', '02-import-everything'))).toEqual(['prd.md', 'wip.md']);
  } finally {
    await rm(join(workspaceRoot(), 'projects', '02-import-everything'), { recursive: true, force: true });
  }
});

test('jump anywhere with ⌘K', async ({ page }) => {
  await page.goto('/w/demo-repo/inbox');
  await expect(page.locator('.feed-row').first()).toBeVisible();
  await page.keyboard.press('ControlOrMeta+k');
  const palette = page.getByRole('dialog', { name: 'Command palette' });
  await expect(palette.getByRole('option').first()).toHaveText(/New issue/);
  await palette.getByRole('combobox').fill('0003');
  await expect(palette.getByRole('option').first()).toHaveText(/#0003 Check the new layout by hand/);
  await palette.getByRole('combobox').press('Enter');
  await expect(page.locator('.issue-view-title')).toHaveText('Check the new layout by hand');

  await page.keyboard.press('ControlOrMeta+k');
  await palette.getByRole('combobox').fill('specs');
  await palette.getByRole('combobox').press('Enter');
  await expect(page).toHaveURL(/\/specs$/);
});

test('act on the selected issue with ⌘K', async ({ page }) => {
  const original = await readIssueFile('0001-wire-the-export-button.md');
  try {
    await page.goto('/w/demo-repo/inbox');
    await page.locator('.feed-row', { hasText: 'Wire the export button' }).click();
    await page.keyboard.press('ControlOrMeta+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette.locator('.palette-group').first()).toHaveText('Selected issue');
    await palette.getByRole('combobox').fill('move in progress');
    await palette.getByRole('combobox').press('Enter');
    await expect(page.locator('.col-in-progress [data-issue-id="0001"]')).toBeVisible();
    await expect.poll(() => readIssueFile('0001-wire-the-export-button.md')).toContain('status: in-progress');
  } finally {
    await writeIssueFile('0001-wire-the-export-button.md', original);
  }
});

test('copy an agent prompt', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/w/demo-repo/inbox');
  await page.locator('.col-todo [data-issue-id="0001"] .card').click();
  await page.getByRole('dialog', { name: 'Issue detail' }).getByRole('button', { name: 'Copy agent prompt' }).click();
  await expect(page.getByText('Agent prompt copied')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Use the implement skill on #0001.');

  await page.keyboard.press('Escape');
  await page.locator('.pane-head').getByRole('button', { name: 'Copy agent prompt' }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('Continue project 01-demo-project: read wip.md "Current focus" and implement the next todo issue.');
});
