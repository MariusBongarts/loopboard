import { expect, test } from '@playwright/test';
import { readIssueFile, writeIssueFile } from './workspace';

// Spec § 4 — Changing issues from the board.
test('drag a card to another column', async ({ page }) => {
  const original = await readIssueFile('0001-wire-the-export-button.md');
  try {
    await page.goto('/');
    await page.locator('.feed-row', { hasText: 'Wire the export button' }).click();
    const card = page.locator('.col-todo [data-issue-id="0001"]');
    await expect(card).toBeVisible();
    await card.dragTo(page.locator('.col-in-progress .column-list'), { targetPosition: { x: 40, y: 20 } });

    await expect(page.locator('.col-in-progress [data-issue-id="0001"]')).toBeVisible();
    // Only the status line changes; every other byte stays (#0040 fix).
    await expect
      .poll(() => readIssueFile('0001-wire-the-export-button.md'))
      .toBe(original.replace('status: todo', 'status: in-progress'));
  } finally {
    await writeIssueFile('0001-wire-the-export-button.md', original);
  }
});

test('close an issue as wontfix', async ({ page }) => {
  const original = await readIssueFile('0005-wait-for-the-vendor.md');
  try {
    await page.goto('/w/demo-repo');
    await page.locator('.col-blocked [data-issue-id="0005"] .card').click();
    await page.keyboard.press('ControlOrMeta+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await palette.getByRole('combobox').fill('wontfix');
    await palette.getByRole('combobox').press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Why rejected' });
    const confirm = dialog.getByRole('button', { name: 'Append & mark wontfix' });
    await expect(confirm).toBeDisabled();
    await dialog.getByRole('textbox').fill('The vendor shut down.');
    await confirm.click();
    await expect.poll(() => readIssueFile('0005-wait-for-the-vendor.md')).toContain('status: wontfix');
    expect(await readIssueFile('0005-wait-for-the-vendor.md')).toContain('## Why rejected\n\nThe vendor shut down.\n');
  } finally {
    await writeIssueFile('0005-wait-for-the-vendor.md', original);
  }
});

test('mark done work reviewed, and work through the review queue', async ({ page }) => {
  const original = await readIssueFile('0004-add-the-api-route.md');
  try {
    await page.goto('/w/demo-repo');
    await page.locator('.feed-row', { hasText: 'Add the API route' }).click();
    const queue = page.getByRole('button', { name: 'Unreviewed 1' });
    await queue.click();
    await expect(page.locator('.col-todo [data-issue-id]')).toHaveCount(0);
    await expect(page.locator('.col-done [data-issue-id]')).toHaveCount(1);

    await page.locator('.col-done [data-issue-id="0004"] .card').click();
    const drawer = page.getByRole('dialog', { name: 'Issue detail' });
    await drawer.getByRole('button', { name: 'Mark reviewed' }).click();
    await expect(drawer.locator('.marker-reviewed')).toBeVisible();
    await expect.poll(() => readIssueFile('0004-add-the-api-route.md')).toMatch(/created: 2026-09-10\nreviewed: \d{4}-\d{2}-\d{2}\n/);
    // Reviewed work leaves the queue; with the queue off the card shows its badge.
    await expect(page.locator('.col-done [data-issue-id]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Unreviewed/ }).click();
    await expect(page.locator('.col-done [data-issue-id="0004"] .marker-reviewed')).toBeVisible();
    await page.locator('.col-done [data-issue-id="0004"] .card').click();

    await drawer.getByRole('button', { name: 'Unmark reviewed' }).click();
    await expect.poll(() => readIssueFile('0004-add-the-api-route.md')).toBe(original);
  } finally {
    await writeIssueFile('0004-add-the-api-route.md', original);
  }
});

test('drag a card into position writes priorities for the column', async ({ page }) => {
  const one = await readIssueFile('0001-wire-the-export-button.md');
  const two = await readIssueFile('0002-cache-the-feed.md');
  // The server numbers the whole todo bucket, standalone #0007 included.
  const seven = await readIssueFile('0007-fix-the-readme-typo.md');
  try {
    await page.goto('/w/demo-repo');
    await page.locator('.feed-row', { hasText: 'Wire the export button' }).click();
    await page.locator('.col-in-progress [data-issue-id="0002"]').dragTo(page.locator('.col-todo [data-issue-id="0001"]'), {
      targetPosition: { x: 40, y: 4 },
    });
    await expect(page.locator('.col-todo [data-issue-id]')).toHaveCount(2);
    await expect.poll(() => readIssueFile('0002-cache-the-feed.md')).toMatch(/status: todo\nassignee: agent\npriority: 1\n/);
    await expect.poll(() => readIssueFile('0001-wire-the-export-button.md')).toMatch(/assignee: agent\npriority: 2\n/);
    await expect(page.locator('.col-todo [data-issue-id]').first()).toHaveAttribute('data-issue-id', '0002');
  } finally {
    await writeIssueFile('0001-wire-the-export-button.md', one);
    await writeIssueFile('0002-cache-the-feed.md', two);
    await writeIssueFile('0007-fix-the-readme-typo.md', seven);
  }
});

test('toggle the assignee on a card without opening it', async ({ page }) => {
  const original = await readIssueFile('0001-wire-the-export-button.md');
  try {
    await page.goto('/w/demo-repo');
    await page.locator('.feed-row', { hasText: 'Wire the export button' }).click();
    await page.locator('[data-issue-id="0001"]').getByRole('button', { name: 'Toggle assignee (currently agent)' }).click();
    await expect.poll(() => readIssueFile('0001-wire-the-export-button.md')).toBe(original.replace('assignee: agent', 'assignee: human'));
    await expect(page.getByRole('dialog', { name: 'Issue detail' })).toHaveCount(0);
  } finally {
    await writeIssueFile('0001-wire-the-export-button.md', original);
  }
});

test('a failed write is reported and undone', async ({ page }) => {
  await page.route('**/api/w/demo-repo/issues/0001*', (route) =>
    route.request().method() === 'PATCH' ? route.fulfill({ status: 500, json: { error: 'disk is read-only' } }) : route.continue(),
  );
  await page.goto('/w/demo-repo');
  await page.locator('.feed-row', { hasText: 'Wire the export button' }).click();
  await page.locator('.col-todo [data-issue-id="0001"]').dragTo(page.locator('.col-in-progress .column-list'), { targetPosition: { x: 40, y: 20 } });
  await expect(page.locator('.banner-error')).toContainText('disk is read-only');
  await expect(page.locator('.col-todo [data-issue-id="0001"]')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await expect(page.locator('.banner-error')).toHaveCount(0);
});

test("change an issue's properties in place", async ({ page }) => {
  const file = '0007-fix-the-readme-typo.md';
  const original = await readIssueFile(file);
  try {
    await page.goto('/w/demo-repo');
    await page.locator('.feed-row', { hasText: 'Fix the README typo' }).click();
    await page.locator('[data-issue-id="0007"] .card').click();
    const panel = page.getByRole('dialog', { name: 'Issue detail' });

    // Keyboard: the menu opens on Backlog; two steps down is In progress.
    await panel.getByRole('button', { name: 'Status: Todo' }).click();
    await expect(page.getByRole('menu', { name: 'Status' }).getByRole('menuitemcheckbox', { name: 'Todo' })).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(panel.getByRole('button', { name: 'Status: In progress' })).toBeVisible();

    await panel.getByRole('button', { name: 'Assignee: Agent' }).click();
    await page.getByRole('menu', { name: 'Assignee' }).getByRole('menuitemcheckbox', { name: 'You' }).click();

    await panel.getByRole('button', { name: 'Project: none' }).click();
    await page.keyboard.type('demo');
    await page.keyboard.press('Enter');

    await panel.getByRole('button', { name: 'Labels: none' }).click();
    const labels = page.getByRole('menu', { name: 'Labels' });
    await labels.getByRole('menuitemcheckbox', { name: 'ui' }).click();
    await expect(labels.getByRole('menuitemcheckbox', { name: 'ui' })).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.type('docs');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect(labels).toHaveCount(0);
    await expect(panel).toBeVisible();

    await panel.getByRole('button', { name: 'Parent: none' }).click();
    await page.keyboard.type('0002');
    await page.keyboard.press('Enter');

    await expect
      .poll(() => readIssueFile(file))
      .toBe(
        original
          .replace('status: todo\nassignee: agent\nlabels: []', 'status: in-progress\nassignee: human\nproject: 01-demo-project\nparent: 0002\nlabels: [ui, docs]'),
      );
    await expect(panel.getByRole('button', { name: 'Parent: #0002' })).toBeVisible();

    // Clearing removes the lines again.
    await panel.getByRole('button', { name: 'Parent: #0002' }).click();
    await page.getByRole('menu', { name: 'Parent' }).getByRole('menuitemcheckbox', { name: 'No parent' }).click();
    await panel.getByRole('button', { name: 'Project: 01-demo-project' }).click();
    await page.getByRole('menu', { name: 'Project' }).getByRole('menuitemcheckbox', { name: 'No project' }).click();
    await expect.poll(() => readIssueFile(file)).not.toMatch(/^(project|parent):/m);
  } finally {
    await writeIssueFile(file, original);
  }
});

test('right-click a card or row for the issue menu', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const file = '0001-wire-the-export-button.md';
  const original = await readIssueFile(file);
  try {
    await page.goto('/w/demo-repo');
    await page.locator('.feed-row', { hasText: 'Wire the export button' }).click();
    await page.locator('[data-issue-id="0001"] .card').click({ button: 'right' });
    const menu = page.getByRole('menu', { name: 'Issue #0001' });
    await expect(menu.getByRole('menuitem')).toHaveText([/Status/, /Assignee/, /Labels/, /Project/, /^Open$/, /Open as page/, /Copy agent prompt/, /Copy path/, /Copy link/]);
    await menu.getByRole('menuitem', { name: 'Status' }).hover();
    await page.getByRole('menuitemcheckbox', { name: 'In review' }).click();
    await expect.poll(() => readIssueFile(file)).toBe(original.replace('status: todo', 'status: in-review'));
    await expect(menu).toHaveCount(0);

    await page.goto('/w/demo-repo/issues');
    const row = page.locator('.issue-row[data-issue-id="0001"]');
    await row.click({ button: 'right' });
    await page.getByRole('menu', { name: 'Issue #0001' }).getByRole('menuitem', { name: 'Copy link' }).click();
    await expect(page.locator('.toast')).toContainText('Link copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/w\/demo-repo\/issues\/0001$/);

    // The keyboard's context-menu shortcut opens it at the focused row.
    await row.focus();
    await page.keyboard.press('Shift+F10');
    await expect(page.getByRole('menu', { name: 'Issue #0001' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu', { name: 'Issue #0001' })).toHaveCount(0);
  } finally {
    await writeIssueFile(file, original);
  }
});
