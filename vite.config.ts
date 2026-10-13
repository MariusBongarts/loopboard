import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { loopboardApi } from './server/plugin';

export default defineConfig(({ isSsrBuild }) => ({
  // Vitest starts a Vite server from this file too. Without the API plugin a
  // test run can't register this checkout as a workspace (#0111).
  plugins: [vue(), ...(process.env.VITEST ? [] : [loopboardApi({ basePath: process.env.BASE_PATH })])],
  build: {
    outDir: 'build/client',
    emptyOutDir: true,
    // public/ (Help Center videos, #0064) belongs to the client only.
    copyPublicDir: !isSsrBuild,
  },
  // Falls through to the next free port when 5180 is taken.
  server: {
    port: 5180,
    strictPort: false,
  },
  // Playwright owns tests/e2e (#0006).
  test: {
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    // A test that sets no config directory still can't reach the user's (#0111).
    env: { LOOPBOARD_CONFIG_DIR: join(tmpdir(), 'loopboard-vitest') },
  },
}));
