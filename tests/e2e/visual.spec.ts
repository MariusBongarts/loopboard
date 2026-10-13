import { expect, test, type Page } from '@playwright/test';

// Visual regression for the main screens, both themes. Baselines are macOS
// renders (fonts differ per OS), so other platforms skip this file.
test.skip(process.platform !== 'darwin', 'visual baselines are macOS renders');
test.use({ viewport: { width: 1440, height: 900 } });

async function open(page: Page, path: string, theme: 'light' | 'dark') {
  await page.clock.setFixedTime(new Date('2026-09-15T10:00:00'));
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
}

for (const theme of ['light', 'dark'] as const) {
  test(`inbox and board — ${theme}`, async ({ page }) => {
    await open(page, '/w/demo-repo', theme);
    await page.locator('.feed-row', { hasText: 'Wire the export button' }).click();
    await expect(page.locator('.live-dot.live')).toBeVisible();
    await expect(page).toHaveScreenshot(`inbox-${theme}.png`, { animations: 'disabled' });
  });

  test(`issue panel, picker, editor and page — ${theme}`, async ({ page }) => {
    await open(page, '/w/demo-repo', theme);
    await page.locator('.feed-row', { hasText: 'Cache the feed' }).click();
    await page.locator('[data-issue-id="0002"] .card').click();
    const panel = page.getByRole('dialog', { name: 'Issue detail' });
    await expect(panel).toBeVisible();
    await expect(page).toHaveScreenshot(`panel-${theme}.png`, { animations: 'disabled' });
    await panel.getByRole('button', { name: 'Status: In progress' }).click();
    await expect(page.getByRole('menu', { name: 'Status' })).toBeVisible();
    await expect(page).toHaveScreenshot(`menu-${theme}.png`, { animations: 'disabled' });
    await page.keyboard.press('Escape');
    await panel.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('radio', { name: 'Rich' }).click();
    await expect(page.getByRole('textbox', { name: 'Body' })).toBeVisible();
    await expect(page).toHaveScreenshot(`editor-${theme}.png`, { animations: 'disabled' });
    await page.goto('/w/demo-repo/issues/0002');
    await expect(page.getByRole('heading', { level: 1, name: 'Cache the feed' })).toBeVisible();
    await expect(page).toHaveScreenshot(`page-${theme}.png`, { animations: 'disabled' });
  });

  test(`list, projects and specs — ${theme}`, async ({ page }) => {
    await open(page, '/w/demo-repo/issues', theme);
    await expect(page.locator('.issue-row').first()).toBeVisible();
    await expect(page).toHaveScreenshot(`list-${theme}.png`, { animations: 'disabled' });
    await page.goto('/w/demo-repo/projects');
    await expect(page.locator('.project-row')).toBeVisible();
    await expect(page).toHaveScreenshot(`projects-${theme}.png`, { animations: 'disabled' });
    await page.goto('/w/demo-repo/specs');
    await expect(page.locator('.spec-scenario').first()).toBeVisible();
    await expect(page).toHaveScreenshot(`specs-${theme}.png`, { animations: 'disabled' });
  });

  test(`help center — ${theme}`, async ({ page }) => {
    await open(page, '/help', theme);
    await expect(page.locator('.course-poster')).toHaveJSProperty('complete', true);
    await expect(page).toHaveScreenshot(`help-${theme}.png`, { animations: 'disabled', fullPage: false });
    await page.goto('/help/upgrade');
    await expect(page.locator('tr[data-workspace]')).toHaveCount(2);
    // Temp-dir paths and the package version change from run to run.
    const mask = [page.locator('.repo-path'), page.locator('.version')];
    await expect(page).toHaveScreenshot(`help-upgrade-${theme}.png`, { animations: 'disabled', fullPage: false, mask });
  });
}

test('command palette — light', async ({ page }) => {
  await open(page, '/w/demo-repo', 'light');
  await expect(page.locator('.feed-row').first()).toBeVisible();
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('combobox').fill('export');
  await expect(page).toHaveScreenshot('palette-light.png', { animations: 'disabled' });
});
