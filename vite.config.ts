import { configDefaults, defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { loopboardApi } from './server/plugin';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [vue(), loopboardApi({ basePath: process.env.BASE_PATH })],
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
  },
}));
