import { expect, test } from '@playwright/test';

// Spec § 14 — Look and feel.
test('switch between system, dark and light, and keep the choice', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/w/demo-repo');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');

  const toggle = page.locator('.rail-theme');
  await expect(toggle).toHaveAttribute('aria-label', 'Theme: system');
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-label', 'Theme: dark');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.locator('.rail-theme').click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.locator('.rail-theme').click();
  await expect(page.locator('.rail-theme')).toHaveAttribute('aria-label', 'Theme: system');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('nothing is loaded from outside this machine', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const host = new URL(r.url()).hostname;
    if (!['localhost', '127.0.0.1', '[::1]'].includes(host) && !r.url().startsWith('data:')) external.push(r.url());
  });
  await page.goto('/w/demo-repo');
  await expect(page.locator('.feed-row').first()).toBeVisible();
  await page.goto('/help');
  await expect(page.getByRole('heading', { name: 'Help' })).toBeVisible();
  expect(await page.evaluate(() => document.fonts.check('16px "Fraunces Variable"'))).toBe(true);
  expect(external).toEqual([]);
});
