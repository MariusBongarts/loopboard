import { expect, test, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readIssueFile, workspaceRoot, writeIssueFile } from './workspace';

// Spec § 12 — Editing.
const FILE = '0007-fix-the-readme-typo.md';

async function openEditor(page: Page, id = '0007', title = 'Fix the README typo', mode: 'Rich' | 'Source' = 'Source') {
  await page.goto('/w/demo-repo');
  await page.locator('.feed-row', { hasText: title }).click();
  await page.locator(`[data-issue-id="${id}"] .card`).click();
  const drawer = page.getByRole('dialog', { name: 'Issue detail' });
  await drawer.getByRole('button', { name: 'Edit' }).click();
  await drawer.getByRole('radio', { name: mode }).click();
  return drawer;
}

test('edit an issue and save', async ({ page }) => {
  const original = await readIssueFile(FILE);
  try {
    const drawer = await openEditor(page);
    const source = drawer.getByLabel('Markdown source');
    await expect(source).toHaveValue(original);
    await source.fill(original.replace('Fixture body for #0007.', 'Typo is in the install section.'));
    await expect(drawer.getByText('Unsaved')).toBeVisible();
    await source.press('ControlOrMeta+s');

    await expect(source).toHaveCount(0);
    await expect(drawer.locator('.drawer-body')).toContainText('Typo is in the install section.');
    expect(await readIssueFile(FILE)).toBe(original.replace('Fixture body for #0007.', 'Typo is in the install section.'));
  } finally {
    await writeIssueFile(FILE, original);
  }
});

test('a change on disk while editing becomes a conflict to resolve', async ({ page }) => {
  const original = await readIssueFile(FILE);
  const theirs = original.replace('Fixture body for #0007.', 'Agent wrote this.');
  const mine = original.replace('Fixture body for #0007.', 'I wrote this.');
  try {
    const drawer = await openEditor(page);
    const source = drawer.getByLabel('Markdown source');
    await source.fill(mine);
    await writeIssueFile(FILE, theirs);
    await expect(drawer.getByText('This file changed on disk.')).toBeVisible();

    await drawer.getByRole('button', { name: /^Save/ }).click();
    await expect(drawer.getByRole('alert')).toContainText('Changed on disk');
    expect(await readIssueFile(FILE)).toBe(theirs);

    await drawer.getByRole('button', { name: 'Compare' }).click();
    const compare = page.getByRole('dialog', { name: 'Compare versions' });
    await expect(compare.locator('.diff-del')).toHaveText('- Agent wrote this.');
    await expect(compare.locator('.diff-add')).toHaveText('+ I wrote this.');
    await compare.getByRole('button', { name: 'Keep mine' }).click();
    await expect.poll(() => readIssueFile(FILE)).toBe(mine);
  } finally {
    await writeIssueFile(FILE, original);
  }
});

test('reload theirs, and follow silently without edits', async ({ page }) => {
  const original = await readIssueFile(FILE);
  try {
    const drawer = await openEditor(page);
    const source = drawer.getByLabel('Markdown source');
    const external = original.replace('Fixture body for #0007.', 'Changed by an agent.');
    await writeIssueFile(FILE, external);
    await expect(source).toHaveValue(external);

    await source.fill(original.replace('Fixture body for #0007.', 'Mine.'));
    await writeIssueFile(FILE, original);
    await drawer.getByRole('button', { name: /^Save/ }).click();
    await drawer.getByRole('button', { name: 'Reload theirs' }).click();
    await expect(source).toHaveValue(original);
    await expect(drawer.getByRole('alert')).toHaveCount(0);
  } finally {
    await writeIssueFile(FILE, original);
  }
});

const CACHE = '0002-cache-the-feed.md';

test('rich editing changes only the lines you touched', async ({ page }) => {
  const original = await readIssueFile(CACHE);
  try {
    const drawer = await openEditor(page, '0002', 'Cache the feed', 'Rich');
    const body = drawer.getByRole('textbox', { name: 'Body' });
    await body.getByText('Fixture body for #0002.').click();
    await page.keyboard.press('End');
    await page.keyboard.type(' Measured.');
    await body.getByRole('checkbox', { name: /Cache hit/ }).check();
    await expect(drawer.getByText('Unsaved')).toBeVisible();
    await page.keyboard.press('ControlOrMeta+s');

    await expect(body).toHaveCount(0);
    expect(await readIssueFile(CACHE)).toBe(
      original.replace('Fixture body for #0002.', 'Fixture body for #0002. Measured.').replace('- [ ] Cache hit', '- [x] Cache hit'),
    );
  } finally {
    await writeIssueFile(CACHE, original);
  }
});

test('fields edit frontmatter lines, # links an issue, and Source carries the draft', async ({ page }) => {
  const original = await readIssueFile(CACHE);
  try {
    const drawer = await openEditor(page, '0002', 'Cache the feed', 'Rich');
    await drawer.getByLabel('Title').fill('Cache the feed: v2');
    await drawer.getByLabel('Status', { exact: true }).selectOption('in-review');
    await drawer.getByLabel('Assignee', { exact: true }).selectOption('human');

    const body = drawer.getByRole('textbox', { name: 'Body' });
    await body.getByText('Fixture body for #0002.').click();
    await page.keyboard.press('End');
    await page.keyboard.type(' See #00');
    const suggest = page.getByRole('listbox', { name: 'Link an issue' });
    await expect(suggest.getByRole('option').first()).toContainText('#0001');
    await page.keyboard.press('Enter');

    await drawer.getByRole('radio', { name: 'Source' }).click();
    const source = drawer.getByLabel('Markdown source');
    await expect(source).toHaveValue(/title: "Cache the feed: v2"\ncategory: task\nstatus: in-review\nassignee: human\n/);
    await expect(source).toHaveValue(/Fixture body for #0002\. See #0001/);
    await source.press('ControlOrMeta+s');
    await expect.poll(() => readIssueFile(CACHE)).toContain('See #0001');
    const saved = await readIssueFile(CACHE);
    expect(saved).toContain('- [ ] Cache hit\n- [ ] Cache miss');
    expect(saved.split('\n').length).toBe(original.split('\n').length);
  } finally {
    await writeIssueFile(CACHE, original);
  }
});

test('edit a PRD and a spec in place', async ({ page }) => {
  const prdPath = join(workspaceRoot(), 'projects', '01-demo-project', 'prd.md');
  const specPath = join(workspaceRoot(), 'specs', '01-export.md');
  const prd = await readFile(prdPath, 'utf8');
  const spec = await readFile(specPath, 'utf8');
  try {
    await page.goto('/w/demo-repo');
    await page.getByRole('tab', { name: 'PRD' }).click();
    await page.getByRole('button', { name: 'Edit PRD' }).click();
    await page.getByRole('radio', { name: 'Rich' }).click();
    const body = page.getByRole('textbox', { name: 'Body' });
    await body.getByText('Fixture users cannot export their data.').click();
    await page.keyboard.press('End');
    await page.keyboard.type(' Or import it.');
    await page.keyboard.press('ControlOrMeta+s');
    await expect.poll(() => readFile(prdPath, 'utf8')).toBe(
      prd.replace('Fixture users cannot export their data.', 'Fixture users cannot export their data. Or import it.'),
    );

    await page.goto('/w/demo-repo/specs');
    await page.getByRole('button', { name: 'Edit spec' }).click();
    await page.getByRole('radio', { name: 'Rich' }).click();
    const specBody = page.getByRole('textbox', { name: 'Body' });
    await expect(specBody.locator('code.language-loopboard-raw')).toHaveCount(1);
    await specBody.getByRole('heading', { name: '1. Export' }).click();
    await page.keyboard.press('End');
    await page.keyboard.type(' data');
    await page.keyboard.press('ControlOrMeta+s');
    await expect.poll(() => readFile(specPath, 'utf8')).toBe(spec.replace('# 1. Export\n', '# 1. Export data\n'));
    await expect(page.locator('.spec-section-title')).toHaveText('1. Export data');
  } finally {
    await writeFile(prdPath, prd);
    await writeFile(specPath, spec);
  }
});
