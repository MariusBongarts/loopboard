import { expect, test } from '@playwright/test';

// Spec § 14 — Look and feel.
test('switch between system, dark and light in Settings, and keep the choice', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/w/demo-repo/inbox');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');

  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  const theme = settings.getByRole('radiogroup', { name: 'Theme' });
  await expect(theme.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
  await theme.getByRole('radio', { name: 'Dark' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await settings.getByRole('button', { name: 'Done' }).click();
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', { name: 'Settings' }).click();
  await theme.getByRole('radio', { name: 'Light' }).click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await theme.getByRole('radio', { name: 'System' }).click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('nothing is loaded from outside this machine', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const host = new URL(r.url()).hostname;
    if (!['localhost', '127.0.0.1', '[::1]'].includes(host) && !r.url().startsWith('data:')) external.push(r.url());
  });
  await page.goto('/w/demo-repo/inbox');
  await expect(page.locator('.feed-row').first()).toBeVisible();
  await page.goto('/help');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Build with agents, steer from the board');
  await page.goto('/help/learn#sources');
  await expect(page.locator('.source-video')).toHaveCount(6);
  expect(await page.evaluate(() => document.fonts.check('16px "Inter Variable"'))).toBe(true);
  expect(external).toEqual([]);
});
