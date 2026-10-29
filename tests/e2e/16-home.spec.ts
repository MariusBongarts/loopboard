import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repo, sandbox, serve } from './cli';

// Spec § 16 — Home (project 06), through the real `loopboard` binary.
let box: { dir: string; config: string };
test.beforeEach(() => {
  box = sandbox();
});
test.afterEach(() => {
  rmSync(box.dir, { recursive: true, force: true });
});

// Today and yesterday in this machine's zone, as runs.md and issues write them.
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = iso(new Date());
const yesterday = iso(new Date(Date.now() - 86_400_000));

function routine(app: string, slug: string, frontmatter: string, runs: string): string {
  const dir = join(app, '.agents', 'scheduled', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'routine.md'), `---\n${frontmatter.trim()}\n---\n\nDo the thing.\n`);
  writeFileSync(join(dir, 'runs.md'), `# Runs: ${slug}\n${runs}`);
  return dir;
}

function issue(app: string, id: string, title: string, extra = '') {
  writeFileSync(
    join(app, '.agents', 'issues', `${id}-${title.toLowerCase().replace(/\W+/g, '-')}.md`),
    `---\nid: ${id}\ntitle: ${title}\nstatus: todo\nassignee: agent\nlabels: []\ncreated: ${today}\n${extra}---\n\nWhat ${title.toLowerCase()} means.\n`,
  );
}

const entry = (day: string, time: string, status: string, note: string) =>
  `\n## ${day} ${time} · ${status}\n- started: ${day}T${time}:04+00:00\n- finished: ${day}T${time.slice(0, 3)}${String(Number(time.slice(3)) + 9).padStart(2, '0')}:00+00:00\n- host: studio\n\n> ${note.split('\n').join('\n> ')}\n`;

function harness() {
  const app = repo(box.dir, 'shop');
  issue(app, '0002', 'Sync badge counts deleted highlights');
  issue(app, '0003', 'Groom the board', 'recurrence: grooming@2026-W44\n');
  issue(app, '0004', 'Filed by hand');
  const triage = routine(
    app,
    'triage',
    'title: Morning triage\nschedule: "0 8 * * *"\ntimezone: UTC',
    entry(yesterday, '08:00', 'ok', 'Quiet night, nothing filed.') + entry(today, '08:00', 'ok', 'Filed #0002 · mentions #0001\n\n**Filed**\n* #0002 the badge bug, see #0001'),
  );
  routine(app, 'e2e', 'title: Nightly e2e\nschedule: "0 2 * * *"\ntimezone: UTC', entry(today, '02:00', 'failed', 'Playwright could not start.'));
  routine(app, 'grooming', 'title: Weekly grooming\nschedule: "0 6 * * 1"\ntimezone: UTC\ncreates: issue\nperiod: week', entry(today, '06:00', 'ok', 'Week filed.'));
  return { app, triage };
}

async function openHome(page: Page, url: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page).toHaveURL(/\/w\/shop\/home$/);
}

test.describe('§ 16 Home', () => {
  test('see runs on the timeline with what they filed, and routine health beside it', async ({ page }) => {
    const { app } = harness();
    const server = await serve(['--port', '0'], app, box.config);
    try {
      await openHome(page, server.url);
      const todayGroup = page.getByRole('region', { name: 'Today' });
      const triage = todayGroup.locator('.tl-entry').filter({ hasText: 'Morning triage' });
      await expect(triage).toContainText('Filed #0002 · mentions #0001');
      await expect(triage.locator('.tl-filed .issue-line')).toHaveText(/#0002\s*Sync badge counts deleted highlights/);
      await expect(triage.locator('.tl-chips')).toContainText('#0001');
      // A filed issue sits under its run only; the issue routine's issue matches by recurrence.
      await expect(page.locator('.tl-entry').filter({ hasText: 'Weekly grooming' }).locator('.tl-filed .issue-line')).toHaveText(/#0003\s*Groom the board/);
      await expect(page.locator('.tl-entry.issue')).toHaveCount(1);
      await expect(page.locator('.tl-entry.issue .tl-title')).toHaveText(/#0004\s*Filed by hand/);

      const failed = todayGroup.locator('.tl-entry').filter({ hasText: 'Nightly e2e' });
      await expect(failed.locator('.run-tag')).toHaveText('Failed');
      await expect(page.getByRole('region', { name: 'Yesterday' }).locator('.tl-entry.quiet')).toContainText('Quiet night, nothing filed.');

      const health = page.getByRole('region', { name: 'Routine health' });
      await expect(health.locator('.health-row')).toHaveCount(3);
      await expect(health.locator('.health-row').filter({ hasText: 'Morning triage' }).locator('.run-tick')).toHaveCount(2);

      // The period is remembered.
      await page.getByRole('radio', { name: 'Today' }).click();
      await expect(page.getByRole('region', { name: 'Yesterday' })).toHaveCount(0);
      await page.reload();
      await expect(page.getByRole('radio', { name: 'Today' })).toHaveAttribute('aria-checked', 'true');
    } finally {
      server.proc.kill();
    }
  });

  test('preview a run by click and by link, step to an issue and back, close with Esc', async ({ page }) => {
    const { app } = harness();
    const server = await serve(['--port', '0'], app, box.config);
    try {
      await openHome(page, server.url);
      await page.locator('.tl-summary', { hasText: 'Filed #0002' }).click();
      await expect(page).toHaveURL(new RegExp(`peek=run(/|%2F)triage(/|%2F)${today}T0800`));
      const dialog = page.getByRole('dialog', { name: 'Run preview' });
      await expect(dialog).toContainText('Issues from this run');
      await expect(dialog.locator('.issue-line').filter({ hasText: '#0002' })).toContainText('Filed');
      await expect(dialog.locator('.issue-line').filter({ hasText: '#0001' })).toContainText('Mentioned');
      await expect(dialog.locator('.run-tick.current')).toHaveCount(1);

      await dialog.locator('.issue-line').filter({ hasText: '#0002' }).click();
      const issueDialog = page.getByRole('dialog', { name: 'Issue preview' });
      await expect(issueDialog).toContainText('Filed by a routine');
      await expect(issueDialog).toContainText('Sync badge counts deleted highlights');
      await issueDialog.getByRole('button', { name: 'Back' }).click();
      await expect(page.getByRole('dialog', { name: 'Run preview' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page).toHaveURL(/\/w\/shop\/home$/);

      // A link opens the same preview after a reload.
      await page.goto(`${server.url.replace(/\/w\/.*/, '')}/w/shop/home?peek=issue/0002`);
      await expect(page.getByRole('dialog', { name: 'Issue preview' })).toContainText('Morning triage');
      await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    } finally {
      server.proc.kill();
    }
  });

  test('hover an issue for its card; Home follows a finished run live and is in ⌘K', async ({ page }) => {
    const { app, triage } = harness();
    const server = await serve(['--port', '0'], app, box.config);
    try {
      await openHome(page, server.url);
      await page.locator('.tl-filed .issue-line').first().hover();
      await expect(page.getByRole('tooltip')).toContainText('What sync badge counts deleted highlights means.');

      writeFileSync(join(triage, 'runs.md'), readFileSync(join(triage, 'runs.md'), 'utf8') + entry(today, '09:00', 'ok', 'Back to normal.'));
      await expect(page.locator('.tl-entry').filter({ hasText: 'Back to normal.' })).toBeVisible();

      await page.getByRole('button', { name: 'Inbox' }).click();
      await page.keyboard.press('ControlOrMeta+k');
      await page.keyboard.type('Go to Home');
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/w\/shop\/home$/);
      await page.getByRole('button', { name: 'Inbox' }).click();
      await page.keyboard.press('h');
      await expect(page).toHaveURL(/\/w\/shop\/home$/);
    } finally {
      server.proc.kill();
    }
  });
});
