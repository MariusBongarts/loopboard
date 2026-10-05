import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

// Tests write to files, so every run gets fresh copies of the fixture repos
// and its own config dir (#0006, #0008). Workers inherit the env and skip this.
if (!process.env.LOOPBOARD_E2E_ROOT) {
  const tmp = mkdtempSync(join(tmpdir(), 'loopboard-e2e-'));
  const fixtures = fileURLToPath(new URL('./tests/e2e/fixtures', import.meta.url));
  cpSync(join(fixtures, 'workspace'), join(tmp, 'demo-repo', '.agents'), { recursive: true });
  cpSync(join(fixtures, 'legacy-repo'), join(tmp, 'legacy-repo'), { recursive: true });
  const config = join(tmp, 'config');
  mkdirSync(config);
  writeFileSync(
    join(config, 'workspaces.json'),
    JSON.stringify({
      workspaces: [
        { id: 'demo-repo', name: 'demo-repo', repoPath: join(tmp, 'demo-repo'), root: join(tmp, 'demo-repo', '.agents') },
        { id: 'legacy-repo', name: 'legacy-repo', repoPath: join(tmp, 'legacy-repo'), root: join(tmp, 'legacy-repo', 'ai') },
      ],
      lastUsed: 'demo-repo',
    }),
  );
  process.env.LOOPBOARD_E2E_ROOT = tmp;
}
const tmp = process.env.LOOPBOARD_E2E_ROOT;
const PORT = 5199;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  globalSetup: './tests/e2e/setup.ts',
  globalTeardown: './tests/e2e/teardown.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  expect: {
    // Visual baselines: tolerate anti-aliasing noise, not layout changes.
    // Tight enough to catch a moved chip or a stray bullet (1% hid both).
    toHaveScreenshot: { maxDiffPixelRatio: 0.002 },
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{platform}{ext}',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    env: { BASE_PATH: join(tmp, 'demo-repo'), LOOPBOARD_CONFIG_DIR: join(tmp, 'config') },
  },
});
