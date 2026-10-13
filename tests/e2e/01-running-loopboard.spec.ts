import { expect, test } from '@playwright/test';

// Spec § 1 — Running loopboard.
test('a malformed issue file does not break the board', async ({ page }) => {
  // The fixture's 0009 has invalid YAML; it must stay out on every read
  // (#0042) and be counted as skipped, not dropped (#0071).
  for (let load = 0; load < 2; load++) {
    await page.goto('/');
    await expect(page.locator('.feed-row')).toHaveCount(9);
    await expect(page.locator('.feed-kind', { hasText: '#0009' })).toHaveCount(0);
    await expect(page.getByText('0009-broken-frontmatter.md')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '1 file skipped' })).toBeVisible();
  }
});
