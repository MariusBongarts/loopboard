import { expect, test } from '@playwright/test';

// Spec § 6 — Specs view.
test('browse specs with their coverage', async ({ page }) => {
  await page.goto('/');
  await page.locator('.rail-nav', { hasText: 'Specs' }).click();

  await expect(page.locator('.specs-aggregate-pct')).toHaveText('33%');
  await expect(page.locator('.specs-aggregate-eyebrow')).toHaveText('covered · 3 scenarios');
  await expect(page.getByRole('heading', { name: '1. Export' })).toBeVisible();
  await expect(page.getByText('Export one project')).toBeVisible();
});

test('"/" focuses the scenario search in the Specs view', async ({ page }) => {
  await page.goto('/w/demo-repo/specs');
  await expect(page.locator('.specs-aggregate-pct')).toBeVisible();
  await page.keyboard.press('/');
  await expect(page.getByPlaceholder('Search scenarios ( / )')).toBeFocused();
  await page.keyboard.type('one project');
  await expect(page.getByText('Export everything')).toHaveCount(0);
  await expect(page).toHaveURL(/\/specs$/);
});

test('filter scenarios by coverage status', async ({ page }) => {
  await page.goto('/w/demo-repo/specs');
  await page.getByRole('button', { name: /^✅/ }).click();
  await expect(page.getByText('Export everything')).toHaveCount(0);
  await expect(page.getByText('Export one project')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Export everything')).toHaveCount(0);
  await page.getByRole('button', { name: /^✅/ }).click();
  await expect(page.getByText('Export everything')).toBeVisible();
});

test('a spec without a coverage table', async ({ page }) => {
  await page.goto('/w/demo-repo/specs?spec=02');
  await expect(page.locator('.spec-section-title')).toHaveText('2. Import');
  await expect(page.getByText('No coverage table — counted as uncovered')).toBeVisible();
});
